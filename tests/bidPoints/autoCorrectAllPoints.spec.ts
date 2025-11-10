import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
import DebugAPIRequestsClient from '../../api/debugRequests'
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient()
let bidInfo: any;
const adminId = 36
test.describe('Учёт факт дат, при не фиксации выезда из прошлой заявки(нулевой)', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки с проверкой для автоперемещения точки А', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(1, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(2, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(4, 'h').format("YYYY-MM-DDTHH:mm:ss+00:00"), [52.44971752166749, 55.73836430679512], [[52.44971752166749, 55.73836430679512]], null, "01:00:00")
            await page.waitForTimeout(75000)
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.locator("//span[contains(text(),'Начата')]").isVisible(); //ожидаю что точка будет в статусе Начата
            await page.waitForTimeout(300000);
            await debugApi.init();
            await debugApi.runTask('ICorrectBidPointsReminderGrain', await getAuthData(36));
            await page.waitForTimeout(300000);
        });
        await test.step('Создание заявки с проверкой для автоперемещения точки B', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(1, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(2, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(6, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Уфа',
                unloadAddress: 'Челны',
                userIdForFilter: adminId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(12, 'h').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, [52.44971752166749, 55.73836430679512]], null, "01:00:00")
            await page.waitForTimeout(75000)
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.locator("//span[contains(text(),'Загрузился')]").isVisible(); //ожидаю что точка будет в статусе Загурзился
            await page.waitForTimeout(300000);
            await debugApi.init();
            await debugApi.runTask('ICorrectBidPointsReminderGrain', await getAuthData(36));
            await page.waitForTimeout(300000);
        });
        await test.step('Создание заявки с проверкой предложения точки А, B', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(1, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(2, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(4, 'h').format("YYYY-MM-DDTHH:mm:ss+00:00"), [52.44971752166749, 55.73836430679512], [[52.44971752166749, 55.73836430679512]], null, "01:00:00")
            await page.waitForTimeout(75000)
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.locator("//span[contains(text(),'Начата')]").isVisible(); //ожидаю что точка будет в статусе Начата
            await page.waitForTimeout(300000);
            await page.reload();
            await page.locator('[class="b-timeline-point__settings"]').first().click();
            await page.locator(`//DIV[@class="dropdown__item"][text()='Предсказать точку заявки']`).click();
            await page.locator('[class="leaflet-popup-content"]').isVisible();
            await expect(page.locator("//small[@class='text-muted']")).toHaveText('Россия, Республика Татарстан (Татарстан), Набережные Челны, Машиностроительная улица, 91А')
            await page.locator('[class="btn btn-xs btn-brand"]').click();
            await page.locator("//DIV[@class='message'][text()='Ваш запрос выполнен успешно.']").isVisible();
            await page.waitForTimeout(120000);
            await page.locator("//span[contains(text(),'На загрузке')]").isVisible(); //ожидаю что точка будет в статусе Загурзился
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
