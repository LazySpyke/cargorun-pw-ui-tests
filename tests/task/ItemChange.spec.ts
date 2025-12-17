// Пример использования:
const startValue: number = 1000;
const startDate: string = moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ssZ")
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import DebugAPIRequestsClient from '../../api/debugRequests'
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
let bidInfo: any;
const adminId = process.env.emptyCompanyAddminId
test.describe('Работа с задачами на пересменку', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let newEntity: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Согласование пересменки', async ({ page, context }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyTaskDriverChangeEmail as string, process.env.emptyTaskDriverChangePassword as string);
        });
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('ict'), moment().subtract(7, 'd').format("YYYY-MM-DDT00:00:00+03:00"), 1380601)
            console.log(newEntity)
            await page.waitForTimeout(5000)
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=driverIds/any(driverIds:driverIds in (${10813186}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=100&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                driverFilter: `id eq 10813186` //хардкоженная проверка
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "08:10:00")
            await page.waitForTimeout(500);
            await debugApi.applyOdometerValues(await getAuthData(process.env.rootId), newEntity.newTrackerId, startValue, startDate, 200)
        });
        await test.step('создание машины и смены с в Эксплуатации(НК)', async () => {
            await page.goto(process.env.nkUrl as string)
            await page.locator('input[type="email"]').fill(process.env.emptyCompanyNKEmail as string)
            await page.locator('input[type="password"]').fill(process.env.emptyCompanyNKPassword as string)
            await page.getByRole('button', { name: 'Войти' }).click();
            await page.getByRole('link', { name: ' Грузовики' }).click();
            await page.waitForTimeout(6000) //ждё пока модалка с уведомлением пропадёт
            await page.getByText('Добавить грузовик').click();
            await page.locator('input[name="cr_id"]').fill(`${bidInfo.carOption.carId}`);
            await page.locator('input[name="imei"]').fill(`${bidInfo.carOption.carTracker}`);

            await page.locator('#number_formatContainer').click();
            await page.getByText('Другой формат').click();
            await page.locator('[name="number"]').fill(`${bidInfo.carOption.number}`)

            await page.locator("#vehicle_brand_idContainer").click();

            //локатор Бренда
            const locatorBrandName = page.getByText('MAN');
            const locatorBrandCount = await locatorBrandName.count();
            await page.getByText('MAN').nth(locatorBrandCount).click();

            await page.locator('#vehicle_type_idContainer').click();
            await page.waitForTimeout(500)
            const locatorTypeName = page.getByText('Тягач');
            const locatorTypeCount = await locatorTypeName.count();
            await page.waitForTimeout(500)
            await page.getByText('Тягач').nth(locatorTypeCount - 1).click();
            await page.getByRole('button', { name: 'Создать' }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();

            await page.getByRole('link', { name: ' Смены' }).click();
            await page.waitForTimeout(10000);
            const changeLocator = await page.locator('[class="font-weight-bold"]');
            const countLocator = await changeLocator.count()
            for (let deleteDriverChange = 0; deleteDriverChange < await countLocator; deleteDriverChange++) {
                await changeLocator.first().click();
                await page.getByText('Удалить').click()
                // await page.locator('//div[@class="popup-dropdown__item popup-dropdown__item--right-arrow"][text()="Удалить"]').click();
                await page.locator('//div[@class="popup-dropdown__item"][text()="Удалить смену"]').click();
                await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
                await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();
            }
            await page.getByText('Добавить смену').click();

            await page.locator('[name="start_time"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY 00:00"))
            await page.locator('[name="end_time"]').fill(moment().add(1, 'd').format("DD.MM.YYYY 00:00"))


            await page.locator('#driver1_idContainer').click();
            await page.waitForTimeout(2500)
            const locatorDriverName = await page.getByText('Перецепляемый Тасковый');
            const locatorDriverCount = await locatorDriverName.count();
            await page.waitForTimeout(2500)
            await page.getByText('Перецепляемый Тасковый').nth(locatorDriverCount - 1).click();

            await page.locator('#vehicle_idContainer').first().click();
            await page.locator('#vehicle_idContainer').type(`${bidInfo.carOption.number}`)
            await page.waitForTimeout(5000)
            await page.locator('#vehicle_idContainer').press('Tab')
            // await page.getByText('УН2943/96').click();
            await page.locator('input[name="address"]').click();
            await page.locator('[class="map__picker-field"]').fill('Иваново')
            await page.locator('[class="map__result-item"]').first().click();
            await expect(page.locator('[class="leaflet-marker-icon map-icon--picker leaflet-zoom-animated leaflet-interactive"]')).toBeVisible();
            await page.locator('[class="btn btn-sm btn-brand map-address__buttons--button"]').click();
            await page.locator('#trailer_idContainer').first().click();
            await page.locator(`text=УН2943/96`).first().click();

            await page.getByRole('button', { name: 'Создать', exact: true }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();

        })
        await test.step('создание пересменки на машину в Эксплуатации(НК)', async () => {
            await page.locator('[class="b-filter__collapse-btn b-filter__collapse-btn--bottom"]').click();
            await page.locator('#vehicle_idContainer').first().click();
            await page.locator('#vehicle_idContainer').type(`${bidInfo.carOption.number}`)
            await page.waitForTimeout(5000)
            await page.locator('#vehicle_idContainer').press('Tab')
            await page.waitForTimeout(1500);
            await page.locator('[class="b-filter__btn b-filter__btn--refresh"]').click();
            await page.waitForTimeout(5000);
            await page.locator('[class="font-weight-bold"]').click();
            await page.locator("//div[@class='popup-dropdown__item popup-dropdown__item--right-arrow'][contains(text(),'Планирование')]").click();
            await page.locator('//div[@class="popup-dropdown__item"][text()="Запланировать пересменку"]').click();
            await page.locator('[title="Добавить водителя"]').first().click();
            await page.locator('//*[@class="ch-driver__item"][text()="Таск Перецепок "]').click();
            await page.locator('input[name="address"]').click();
            await page.locator('[class="map__picker-field"]').fill('Елабуга')
            await page.locator('[class="map__result-item"]').first().click();
            await expect(page.locator('[class="leaflet-marker-icon map-icon--picker leaflet-zoom-animated leaflet-interactive"]')).toBeVisible();
            await page.locator('[class="btn btn-sm btn-brand map-address__buttons--button"]').click();
            await page.getByRole('button', { name: 'Создать', exact: true }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();
        })
        await test.step('вызов фонового таска на создание задач и проверка данных созданной задачи', async () => {
            await debugApi.runTask('ICreateLogistTasksReminderGrain', await getAuthData(process.env.rootId))
            await page.waitForTimeout(30000);
            await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
            await page.locator('[title="Задачи"]').click();
            await page.locator('[class="b-filter__collapse-btn b-filter__collapse-btn--bottom"]').click();
            await page.waitForTimeout(500)
            await page.locator('#typeContainer').click();
            await page.waitForTimeout(500)
            await page.getByRole('option', { name: 'Отправить машину для пересменки' }).click();
            await page.waitForTimeout(3000);
            await expect(page.locator('[class="pb-1 font-weight-bold"]')).toHaveText(`Отправить ТС ${bidInfo.carOption.number} в для пересменки Перецепляемый Тасковый`)
            await page.getByRole('link', { name: '#' }).click();
            await expect(page.getByText('Change item Task')).toBeVisible();
            await page.waitForTimeout(5000)
            const pages = await context.pages();
            const secondPage = pages[1];
            await page.waitForTimeout(5000)
            await expect(await secondPage.locator('[class="pb-4"]').nth(0)).toHaveText(`Отправить ТС ${bidInfo.carOption.number} в для пересменки Перецепляемый Тасковый`)
            // await expect(await page.locator('div').filter({ hasText: `${bidInfo.carOption.number}` })).toBeVisible();
            await expect(await secondPage.getByText(`${moment().add(1, 'd').format("DD.MM.YYYY 00:00")}`)).toBeVisible(); //план дата
            // await expect(await secondPage.getByText('Перецепляемый Тасковый')).toBeVisible(); //фио сменяемого
            await expect(await secondPage.locator('[class="leaflet-marker-icon map-icon--item-changes leaflet-zoom-animated leaflet-interactive"]')).toBeVisible(); //точка на карте
            await expect(await secondPage.locator('[class="badge badge-primary"]')).toContainText('Просмотрено') //статус задачи
            await secondPage.getByText('Согласовать').click();
            await expect(secondPage.getByText('Ваш запрос выполнен успешно')).toBeVisible(); //статус задачи
        })
    })
    test('Не согласование пересменки', async ({ page, context }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyTaskDriverChangeEmail as string, process.env.emptyTaskDriverChangePassword as string);
        });
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('ict'), moment().subtract(7, 'd').format("YYYY-MM-DDT00:00:00+03:00"), 1380601)
            console.log(newEntity)
            await page.waitForTimeout(5000)
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=driverIds/any(driverIds:driverIds in (${10813186}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=100&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                driverFilter: `id eq 10813186` //хардкоженная проверка
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "08:10:00")
            await page.waitForTimeout(500);
            await debugApi.applyOdometerValues(await getAuthData(process.env.rootId), newEntity.newTrackerId, startValue, startDate, 200)
        });
        await test.step('создание машины и смены с в Эксплуатации(НК)', async () => {
            await page.goto(process.env.nkUrl as string)
            await page.locator('input[type="email"]').fill(process.env.emptyCompanyNKEmail as string)
            await page.locator('input[type="password"]').fill(process.env.emptyCompanyNKPassword as string)
            await page.getByRole('button', { name: 'Войти' }).click();
            await page.getByRole('link', { name: ' Грузовики' }).click();
            await page.waitForTimeout(6000) //ждё пока модалка с уведомлением пропадёт
            await page.getByText('Добавить грузовик').click();
            await page.locator('input[name="cr_id"]').fill(`${bidInfo.carOption.carId}`);
            await page.locator('input[name="imei"]').fill(`${bidInfo.carOption.carTracker}`);

            await page.locator('#number_formatContainer').click();
            await page.getByText('Другой формат').click();
            await page.locator('[name="number"]').fill(`${bidInfo.carOption.number}`)

            await page.locator("#vehicle_brand_idContainer").click();

            //локатор Бренда
            const locatorBrandName = page.getByText('MAN');
            const locatorBrandCount = await locatorBrandName.count();
            await page.getByText('MAN').nth(locatorBrandCount).click();

            await page.locator('#vehicle_type_idContainer').click();
            await page.waitForTimeout(500)
            const locatorTypeName = page.getByText('Тягач');
            const locatorTypeCount = await locatorTypeName.count();
            await page.waitForTimeout(500)
            await page.getByText('Тягач').nth(locatorTypeCount - 1).click();
            await page.getByRole('button', { name: 'Создать' }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();

            await page.getByRole('link', { name: ' Смены' }).click();
            await page.waitForTimeout(10000);
            const changeLocator = await page.locator('[class="font-weight-bold"]');
            const countLocator = await changeLocator.count()
            for (let deleteDriverChange = 0; deleteDriverChange < await countLocator; deleteDriverChange++) {
                await changeLocator.first().click();
                await page.getByText('Удалить').click()
                // await page.locator('//div[@class="popup-dropdown__item popup-dropdown__item--right-arrow"][text()="Удалить"]').click();
                await page.locator('//div[@class="popup-dropdown__item"][text()="Удалить смену"]').click();
                await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
                await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();
            }
            await page.getByText('Добавить смену').click();

            await page.locator('[name="start_time"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY 00:00"))
            await page.locator('[name="end_time"]').fill(moment().add(1, 'd').format("DD.MM.YYYY 00:00"))


            await page.locator('#driver1_idContainer').click();
            await page.waitForTimeout(2500)
            const locatorDriverName = await page.getByText('Перецепляемый Тасковый');
            const locatorDriverCount = await locatorDriverName.count();
            await page.waitForTimeout(2500)
            await page.getByText('Перецепляемый Тасковый').nth(locatorDriverCount - 1).click();

            await page.locator('#vehicle_idContainer').first().click();
            await page.locator('#vehicle_idContainer').type(`${bidInfo.carOption.number}`)
            await page.waitForTimeout(5000)
            await page.locator('#vehicle_idContainer').press('Tab')
            // await page.getByText('УН2943/96').click();
            await page.locator('input[name="address"]').click();
            await page.locator('[class="map__picker-field"]').fill('Иваново')
            await page.locator('[class="map__result-item"]').first().click();
            await expect(page.locator('[class="leaflet-marker-icon map-icon--picker leaflet-zoom-animated leaflet-interactive"]')).toBeVisible();
            await page.locator('[class="btn btn-sm btn-brand map-address__buttons--button"]').click();
            await page.locator('#trailer_idContainer').first().click();
            await page.locator(`text=УН2943/96`).first().click();

            await page.getByRole('button', { name: 'Создать', exact: true }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();

        })
        await test.step('создание пересменки на машину в Эксплуатации(НК)', async () => {
            await page.locator('[class="b-filter__collapse-btn b-filter__collapse-btn--bottom"]').click();
            await page.locator('#vehicle_idContainer').first().click();
            await page.locator('#vehicle_idContainer').type(`${bidInfo.carOption.number}`)
            await page.waitForTimeout(5000)
            await page.locator('#vehicle_idContainer').press('Tab')
            await page.waitForTimeout(1500);
            await page.locator('[class="b-filter__btn b-filter__btn--refresh"]').click();
            await page.waitForTimeout(5000);
            await page.locator('[class="font-weight-bold"]').click();
            await page.locator("//div[@class='popup-dropdown__item popup-dropdown__item--right-arrow'][contains(text(),'Планирование')]").click();
            await page.locator('//div[@class="popup-dropdown__item"][text()="Запланировать пересменку"]').click();
            await page.locator('[title="Добавить водителя"]').first().click();
            await page.locator('//*[@class="ch-driver__item"][text()="Таск Перецепок "]').click();
            await page.locator('input[name="address"]').click();
            await page.locator('[class="map__picker-field"]').fill('Елабуга')
            await page.locator('[class="map__result-item"]').first().click();
            await expect(page.locator('[class="leaflet-marker-icon map-icon--picker leaflet-zoom-animated leaflet-interactive"]')).toBeVisible();
            await page.locator('[class="btn btn-sm btn-brand map-address__buttons--button"]').click();
            await page.getByRole('button', { name: 'Создать', exact: true }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();
        })
        await test.step('вызов фонового таска на создание задач и проверка данных созданной задачи', async () => {
            await debugApi.runTask('ICreateLogistTasksReminderGrain', await getAuthData(process.env.rootId))
            await page.waitForTimeout(30000);
            await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
            await page.locator('[title="Задачи"]').click();
            await page.locator('[class="b-filter__collapse-btn b-filter__collapse-btn--bottom"]').click();
            await page.waitForTimeout(500)
            await page.locator('#typeContainer').click();
            await page.waitForTimeout(500)
            await page.getByRole('option', { name: 'Отправить машину для пересменки' }).click();
            await page.waitForTimeout(3000);
            await expect(page.locator('[class="pb-1 font-weight-bold"]')).toHaveText(`Отправить ТС ${bidInfo.carOption.number} в для пересменки Перецепляемый Тасковый`)
            await page.getByRole('link', { name: '#' }).click();
            await expect(page.getByText('Change item Task')).toBeVisible();
            await page.waitForTimeout(5000)
            const pages = await context.pages();
            const secondPage = pages[1];
            await page.waitForTimeout(5000)
            await expect(await secondPage.locator('[class="pb-4"]').nth(0)).toHaveText(`Отправить ТС ${bidInfo.carOption.number} в для пересменки Перецепляемый Тасковый`)
            // await expect(await page.locator('div').filter({ hasText: `${bidInfo.carOption.number}` })).toBeVisible();
            await expect(await secondPage.getByText(`${moment().add(1, 'd').format("DD.MM.YYYY 00:00")}`)).toBeVisible(); //план дата
            // await expect(await secondPage.getByText('Перецепляемый Тасковый')).toBeVisible(); //фио сменяемого
            await expect(await secondPage.locator('[class="leaflet-marker-icon map-icon--item-changes leaflet-zoom-animated leaflet-interactive"]')).toBeVisible(); //точка на карте
            await expect(await secondPage.locator('[class="badge badge-primary"]')).toContainText('Просмотрено') //статус задачи
            await secondPage.getByText('Отказать').click();
            await secondPage.getByText('или написать свою причину').click();
            await secondPage.locator('[name="comment"]').fill(`тест от ${moment().format()}`)
            await secondPage.locator('[class="btn btn-sm btn-secondary"]').click();
            await expect(secondPage.getByText('Ваш запрос выполнен успешно')).toBeVisible(); //статус задачи
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
