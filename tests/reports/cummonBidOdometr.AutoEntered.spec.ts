// Пример использования:
const startValue: number = 1000;
const startDate: string = moment().subtract(30, 'd').format("YYYY-MM-DDTHH:mm:ssZ")
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
test.describe('Проверка отчётов с данными одометра', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    let newEntity: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('создание и приаязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(36), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('ote'), moment().subtract(31, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
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
                planEnterLoadDate: moment().subtract(30, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(16, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Санкт-Петербург',
                unloadAddress: 'Владивосток',
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

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(30, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "08:10:00", 30)
            await page.waitForTimeout(50000);
            await debugApi.applyOdometerValues(await getAuthData(36), newEntity.newTrackerId, startValue, startDate, 500)
        });
        await test.step('создание второй заявки где дата позже', async () => {
            await page.waitForTimeout(60000);
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(15, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Улан-удэ',
                unloadAddress: 'Москва',
                userIdForFilter: adminId,
                reuseCar: true
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(adminId)
            );
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, lastTrackerCarInfo[0].fixedAt, lastTrackerCarInfo[0].location.coordinates, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "16:00:00", 30)
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await debugApi.applyOdometerValues(await getAuthData(36), newEntity.newTrackerId, startValue + 15000, moment().subtract(3, 'h').format("YYYY-MM-DDTHH:mm:ssZ"), 500)
            await page.waitForTimeout(54000)
        })
        await test.step('проверка данных заявок', async () => {
            await page.waitForTimeout(180000)//ждём перерасчётов
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await expect(page.getByTestId('fact-distance')).toHaveText('501') //активный по одометру
            await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
            await expect(page.getByTestId('fact-distance')).toHaveText('1 127') //активный по одометру
            await expect(page.getByTestId('fact-empty-mileage-distance')).toHaveText('1 409') //порожний по одометру
        })
        //TODO изменения дат использования одометра
        //         Новый запрос на получение одометров: GET api / dev / Organization / GetOdometerHistoryItems / { organizationId }

        // Новый запрос на изменение дат одометра: POST api / dev / Organization / UpdateOdometerHistoryItem
        //         {
        //     public long Id { get; set; }

        //     public long OrganizationId { get; set; }

        //     public DateTimeOffset StartedAt { get; set; }
        //     public DateTimeOffset ? EndedAt { get; set; }
        // }

        // Новый запрос на удаление записи по одометру: POST api / dev / Organization / DeleteOdometerHistoryItem
        // {
        //         public long Id { get; set; }

        //     public long OrganizationId { get; set; }
        // }
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
