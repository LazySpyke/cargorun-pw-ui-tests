import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
let bidInfo: any;
test.describe('Create Bid', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: 1305211
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(1305211)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(1305211));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(1305211));
            await bidApi.setStatus(bidResponse.id, await getAuthData(1305211));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(1305211));
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(1305211)
            );
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, lastTrackerCarInfo[0].fixedAt, lastTrackerCarInfo[0].location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "00:10:00")
            await page.waitForTimeout(50000);
        });
        await test.step('создание второй заявки где дата ', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Москва',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: 1305211,
                reuseCar: true
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(1305211));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(1305211));
            await emulatorApi.init();
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(1305211));
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(1305211)
            );
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment(lastTrackerCarInfo[0].fixedAt, "YYYY-MM-DDTHH:mm:ss").add(5, 'd')}+00:00`, lastTrackerCarInfo[0].location.coordinates, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "00:10:00")
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
