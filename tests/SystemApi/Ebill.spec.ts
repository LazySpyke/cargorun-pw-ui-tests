import { test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const clienApi = new APIRequestsClient();
const emulatorApi = new SupportAPIRequestsClient();
const bidApi = new APIBid();
let bidInfo: any;
const adminId = 1322148
test.describe('Работа с ЭТРН', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.ebillLogin as string, process.env.ebillPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Москва',
                userIdForFilter: adminId
            });
            await bidApi.init();
            const bidListDriver = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=driverIds/any(driverids:driverids in (${bidInfo.driver.id}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidListDriver.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            }); //отменяем заявки по водителю
            const bidListCar = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidListCar.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            }); //отменяем заявки по машине
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(5000);
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(4, 'h').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "00:30:00")
            const driverAuth = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            await clienApi.getToken(driverAuth[0].user.phoneNumber as string, driverAuth[0].password as string);
            const getDriverUserId = await clienApi.GetObjectResponse(
                `${process.env.url}/api/adminpanel/getAllDrivers?$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$top=30&$skip=0`,
                await getAuthData(36)
            )
            await page.waitForTimeout(6000); //вынужденная пауза
            const driverCurrentBidResponse = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/Bids/GetCurrentBid`,
                await getAuthData(getDriverUserId[0].userId)
            )
            //TODO реализовать создание данных с контур диадока
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.ebillLogin as string, process.env.ebillPassword as string);
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});