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
const adminId = 1305211
test.describe('Работа с задачами на пересменку', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let newEntity: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(36), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('ict'), moment().subtract(7, 'd').format("YYYY-MM-DDT00:00:00+03:00"), 1380601)
            console.log(newEntity)
            await page.waitForTimeout(25000)
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "08:10:00")
            await page.waitForTimeout(500);
            await debugApi.applyOdometerValues(await getAuthData(36), newEntity.newTrackerId, startValue, startDate, 200)
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
            await page.waitForTimeout(5000)
            const locatorTypeName = page.getByText('Тягач');
            const locatorTypeCount = await locatorTypeName.count();
            await page.waitForTimeout(2500)
            await page.getByText('Тягач').nth(locatorTypeCount - 1).click();
            await page.getByRole('button', { name: 'Создать' }).click();
            await expect(page.locator('[class="Toastify__toast Toastify__toast-theme--light Toastify__toast--success Toastify__toast--close-on-click"]')).toBeVisible();

            await page.getByRole('link', { name: ' Смены' }).click();
            await page.getByText('Добавить смену').click();

            await page.locator('[name="start_time"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator('[name="end_time"]').fill(moment().add(1, 'd').format("DD.MM.YYYY HH:mm"))


            await page.locator('#driver1_idContainer').click();
            await page.waitForTimeout(2500)
            const locatorDriverName = await page.getByText('Перецепляемый Тасковый');
            const locatorDriverCount = await locatorDriverName.count();
            await page.waitForTimeout(2500)
            await page.getByText('Перецепляемый Тасковый').nth(locatorDriverCount - 1).click();

            await page.locator('#vehicle_idContainer').first().click();
            await page.locator(`text=${bidInfo.carOption.number}`).first().click();
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
            await page.locator(`text=${bidInfo.carOption.number}`).first().click();
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
            await debugApi.runTask('ICreateLogistTasksReminderGrain', await getAuthData(36))
            // await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
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
