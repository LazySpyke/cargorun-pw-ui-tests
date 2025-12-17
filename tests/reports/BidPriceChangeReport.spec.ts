import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import api from '../../api/apiRequests';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const apiUse = new api();
let bidInfo: any;
const adminId = process.env.rootId
test.describe('Отчёты по Изменению стоимости заявки', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let copyBidId: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание черновика с редактированием через apply', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
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
                    "remainingPayment": 500,
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
        });
        await test.step('Меняем данные по цене в черновике', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('input[name="price"]').fill('50000')
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(15000);
        });
        await test.step('запуск заявки в работу и смена данных по цене', async () => {
            await page.waitForTimeout(15000);
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(15000);
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('input[name="price"]').fill('25000')
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(5000);
        });
        await test.step('Проверка Отчет по изменениям стоимости в заявках', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по изменениям стоимости в заявках"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('[class="btn btn-sm btn-brand"]').first().click();
            await page.waitForTimeout(5000);
            await page.locator('[name="bidId"]').fill(`${bidResponse.id}`)
            await page.waitForTimeout(1000);
            await page.locator(`a[data-bidid="${bidResponse.id}"]`).isVisible();
            await page.locator("//i[@class='r-item__expander icon-uEAAE-angle-right-solid']").click();
            await expect(page.locator(`[data-newvalue="${bidResponse.id}Last2 First2 Patronymic3"]`).first()).toHaveText('50 000,00')
            await expect(page.locator(`[data-previousvalue="${bidResponse.id}Last2 First2 Patronymic3"]`).first()).toHaveText('100 000,00')
            await expect(page.locator(`[data-newvalue="${bidResponse.id}Last2 First2 Patronymic3"]`).nth(1)).toHaveText('25 000,00')
            await expect(page.locator(`[data-previousvalue="${bidResponse.id}Last2 First2 Patronymic3"]`).nth(1)).toHaveText('50 000,00')
        });
    });
    test('Создание черновика с редактированием через patch', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
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
                    "remainingPayment": 500,
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
        });
        await test.step('Меняем данные по цене в черновике', async () => {
            await apiUse.init();
            const patchPrice = await apiUse.postData(`${process.env.url}/api/truckingbids/patch`, {
                "price": 100000,
                "id": bidResponse.id
            }, await getAuthData(adminId))
            console.log(patchPrice)
        })
        await test.step('запуск заявки в работу и смена данных по цене', async () => {
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(5000)
            const patchPrice = await apiUse.postData(`${process.env.url}/api/truckingbids/patch`, {
                "price": 25000,
                "id": bidResponse.id
            }, await getAuthData(adminId))
            console.log(patchPrice)
            await page.waitForTimeout(5000)
        });
        await test.step('Проверка Отчет по изменениям стоимости в заявках', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по изменениям стоимости в заявках"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm')); //увеличивает период из-за кэша
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('[class="btn btn-sm btn-brand"]').first().click();
            await page.waitForTimeout(5000);
            await page.locator('[name="bidId"]').fill(`${bidResponse.id}`)
            await page.waitForTimeout(1000);
            await page.locator(`a[data-bidid="${bidResponse.id}"]`).isVisible();
            await page.locator("//i[@class='r-item__expander icon-uEAAE-angle-right-solid']").click();
            await expect(page.locator(`[data-newvalue="${bidResponse.id}Last2 First2 Patronymic3"]`)).toHaveText('25 000,00')
            await expect(page.locator(`[data-previousvalue="${bidResponse.id}Last2 First2 Patronymic3"]`)).toHaveText('100 000,00')
        });
    });
    test('копирование заявки,редактирование цены и ожидание что изменение не зафиксируется до запуска заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 500,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                cargosName: 'тест копирования'
                // paymentStatus: {
                //     "invoiceDate": moment().format("YYYY-MM-DD"),
                //     "planPaymentDate": moment().add(1, 'd').format("YYYY-MM-DD"),
                //     "factPaymentDate": null,
                //     "paymentStatus": "PartiallyPaid",
                //     "remainingPayment": 500,
                //     "comment": "Проверка автотеста",
                // }
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
        });
        await test.step('Меняем данные по цене в черновике', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator('[class="dropdown__btn"]').click();
            await page.getByText('Создать копию заявки').click();
            await page.locator('[class="checkbox d-inline-block checkbox--checked"]').click()//делаем копию с датами
            await page.locator('[class="btn btn-sm btn-brand btn-block"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.getByText('Ваш запрос выполнен успешно.').click()
            await page.locator('[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            const currentUrl = await page.url();
            copyBidId = currentUrl.match(/\d+/g);
            console.log(copyBidId)
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('input[name="price"]').fill('1000')
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.getByText('Ваш запрос выполнен успешно.').click()
            await page.waitForTimeout(15000);
        });
        await test.step('Меняем данные по цене в черновике', async () => {
            await apiUse.init();
            const patchPrice = await apiUse.postData(`${process.env.url}/api/truckingbids/patch`, {
                "price": 2000,
                "id": copyBidId[0]
            }, await getAuthData(adminId))
            console.log(patchPrice)
        })
        await test.step('Проверка Отчет по изменениям стоимости в заявках', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по изменениям стоимости в заявках"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(4, 'd').format('DD.MM.YYYY HH:mm')); //увеличивает период из-за кэша
            await page.locator('input[name="endDate"]').fill(moment().add(2, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('[class="btn btn-sm btn-brand"]').first().click();
            await page.waitForTimeout(5000);
            await page.locator('[name="bidId"]').fill(`${copyBidId[0]}`)
            await page.waitForTimeout(5000);
            await expect(page.locator(`a[data-bidid="${bidResponse.id}"]`)).toBeHidden();
        });
    })
});

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
