import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import { faker } from '@faker-js/faker/locale/ru';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import DebugAPIRequestsClient from '../../api/debugRequests'
import APIBid from '../../api/bidApi';
import api from '../../api/apiRequests';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const debugApi = new DebugAPIRequestsClient()
let bidInfo: any;
const apiUse = new api();
const adminId = process.env.rootId
const randomInn = Math.floor(Math.random() * 999999999999) + 10000000000;
const newCargoOwner = {
    "isValid": true,
    "name": faker.company.name() + faker.company.name(),
    "inn": randomInn,
    "kpp": null,
    "platforms": []
}
test.describe('Отчёт по Дебиторской задолженности', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let newCargoOwnerForReport: any
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Выставление частичной оплаты', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().add(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "PartiallyPaid",
                    "remainingPayment": 25000,
                    "comment": "Проверка автотеста",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('Проверка отображения информации о частичной оплате', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator(`[name='Отчет "Дебиторская задолженность"']`).click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(5000);
            await page.locator('[class="badge badge-pill badge-warning"]')
            await expect(page.locator('[class="small"]')).toHaveText('Остаток оплаты:25 000,00 ₽')
        });
    });
    test('Смена статуса в отчёте для завершенной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().subtract(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "NotPaid",
                    "remainingPayment": null,
                    "comment": "тест смены статуса в отчёте",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await debugApi.init();
        })
        await test.step('завершение заявки', async () => {
            await page.waitForTimeout(60000);
            await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(15000)
            await debugApi.runTask('ICheckPaymentLatenessReminderGrain', await getAuthData(process.env.rootId)) //запускаем таск на проставление статуса просрочена
        })
        await test.step('Проверка отображения информации по оплате в отчёте', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator(`[name='Отчет "Дебиторская задолженность"']`).click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(5000);
            await page.locator('[class="badge badge-pill badge-warning"]')
            await expect(page.locator('[class="small"]')).toHaveText('Просрочено: 1 день')
            await page.getByText('Просрочено: 1 день').click();
            await page.locator('[class="form-control form-control-xs"]').selectOption('Не оплачен');

            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)


            await expect(page.locator('[class="small"]')).toHaveText('Просрочено: 1 день')
            await page.getByText('Просрочено: 1 день').click();
            await page.locator('[class="form-control form-control-xs"]').selectOption('Частичная оплата');

            await page.locator('[name="remainingPayment"]').fill('20000')
            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)

            await expect(page.locator('[class="small"]').first()).toHaveText('Просрочено: 1 день')
            await page.getByText('Просрочено: 1 день').first().click();
            await page.locator('[class="form-control form-control-xs"]').nth(0).selectOption('Оплачен');

            await page.locator('[name="factPaymentDate"]').nth(1).fill(moment().format("DD.MM.YYYY"))
            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)
        });
    });
    test('Смена статуса в отчёте для активной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().subtract(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "NotPaid",
                    "remainingPayment": null,
                    "comment": "тест смены статуса в отчёте",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await debugApi.init();
        })
        await test.step('Запуск фонового таска', async () => {
            await page.waitForTimeout(60000);
            await debugApi.runTask('ICheckPaymentLatenessReminderGrain', await getAuthData(process.env.rootId)) //запускаем таск на проставление статуса просрочена
        })
        await test.step('Проверка отображения информации о частичной оплате', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator(`[name='Отчет "Дебиторская задолженность"']`).click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(5000);
            await page.locator('[class="badge badge-pill badge-warning"]')
            await expect(page.locator('[class="small"]')).toHaveText('Просрочено: 1 день')
            await page.getByText('Просрочено: 1 день').click();
            await page.locator('[class="form-control form-control-xs"]').selectOption('Не оплачен');

            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)


            await expect(page.locator('[class="small"]')).toHaveText('Просрочено: 1 день')
            await page.getByText('Просрочено: 1 день').click();
            await page.locator('[class="form-control form-control-xs"]').selectOption('Частичная оплата');

            await page.locator('[name="remainingPayment"]').fill('20000')
            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)

            await expect(page.locator('[class="small"]').first()).toHaveText('Просрочено: 1 день')
            await page.getByText('Просрочено: 1 день').first().click();
            await page.locator('[class="form-control form-control-xs"]').nth(0).selectOption('Оплачен');

            await page.locator('[name="factPaymentDate"]').nth(1).fill(moment().format("DD.MM.YYYY"))
            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)
        });
    });
    test('Проверка данных по контрагенту', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            apiUse.init();
            newCargoOwnerForReport = await apiUse.postData(`${process.env.url}/api/cargoOwnerDictionary/apply`, newCargoOwner, await getAuthData(process.env.rootId))
            console.log(newCargoOwnerForReport)
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(14, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(13, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                cargoOwnerFilter: `id eq ${newCargoOwnerForReport.id}`,
                userIdForFilter: adminId,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().subtract(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "NotPaid",
                    "remainingPayment": null,
                    "comment": "тест смены статуса в отчёте",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await debugApi.init();
        })
        await test.step('Создание запланированной заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(12, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(11, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                cargoOwnerFilter: `id eq ${newCargoOwnerForReport.id}`,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().add(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "NotPaid",
                    "remainingPayment": null,
                    "comment": "тест смены статуса в отчёте",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await debugApi.init();
        })
        await test.step('Создание второй запланированной заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(10, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(8, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                cargoOwnerFilter: `id eq ${newCargoOwnerForReport.id}`,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().add(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": moment().format("YYYY-MM-DD"),
                    "paymentStatus": "Paid",
                    "remainingPayment": null,
                    "comment": "тест смены статуса в отчёте",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await debugApi.init();
        })
        await test.step('Создание третьей запланированной заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 75000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(5, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                cargoOwnerFilter: `id eq ${newCargoOwnerForReport.id}`,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().add(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "PartiallyPaid",
                    "remainingPayment": "10000",
                    "comment": "тест смены статуса в отчёте",
                }
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await debugApi.init();
        })
        await test.step('Запуск фонового таска', async () => {
            await page.waitForTimeout(60000);
            await debugApi.runTask('ICheckPaymentLatenessReminderGrain', await getAuthData(process.env.rootId)) //запускаем таск на проставление статуса просрочена
        })
        await test.step('Проверка отображения информации о частичной оплате', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator(`[name='Отчет "Дебиторская задолженность"']`).click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('#counterpartyIdInput').click();
            await page.locator('#counterpartyIdInput').fill(`${newCargoOwner.name}`)
            await page.getByRole('option', {
                name: `${newCargoOwner.name}`
            }).click();
            await expect(page.locator("//b[@class='px-2 small pb-2']")).toHaveText(`Показатели контрагента ${newCargoOwner.name}`)
            await page.locator("//i[@class='icon-uEA0C-gear inline-icon text-warning ml-3 font-size-14 cursor-poiner']").click();
            await page.locator('[name="30"]').click(); //30 дней период по контрагенту выбираем
            await expect(page.locator("//td[contains(text(),'300 000,00 ₽')]")).toBeVisible();//Общая сумма за период:
            await expect(page.locator("//td[contains(text(),'140 000,00 ₽')]")).toBeVisible();//Оплачено:
            await expect(page.locator("//td[contains(text(),'85 000,00 ₽')]")).toBeVisible();//Ожидаемая оплата:
            await expect(page.locator("//tbody/tr[5]/td[2]")).toHaveText('1 день') // средняя просрочка
            await expect(page.locator("//td[contains(text(),'75 000,00 ₽')]")).toBeVisible();//Долг:
            await expect(page.locator("//tbody/tr[5]/td[2]")).toHaveText('1 заявка')//кол-во просрочнных
        });
    });
})
test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
