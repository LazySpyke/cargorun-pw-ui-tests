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
const adminId = 1305211
interface Visit {
    id: number;
    isMobile: boolean;
    bidPointId: number;
    enterDate: string;
    leaveDate: string;
}

function findClosestVisitToPlanDate(visits: Visit[], planDateStr: string): Visit | null {
    const planMoment = moment(planDateStr);
    let closestVisit: Visit | null = null;
    let minDiff = Infinity;

    for (const visit of visits) {
        // Можно сравнить как с enterDate, так и с leaveDate, в зависимости от вашей логики
        const enterMoment = moment(visit.enterDate);
        const leaveMoment = moment(visit.leaveDate);

        const diffEnter = Math.abs(planMoment.diff(enterMoment));
        const diffLeave = Math.abs(planMoment.diff(leaveMoment));

        // Можно выбрать минимум между двумя датами внутри визита
        const visitDiff = Math.min(diffEnter, diffLeave);

        if (visitDiff < minDiff) {
            minDiff = visitDiff;
            closestVisit = visit;
        }
    }

    return closestVisit;
}
test.describe('Учёт точек при кругорейсах, даты приближенные к плану', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу, с кругорейсовым посещением', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(5, 'd').format('YYYY-MM-DDT00:00'),
                planEnterUnloadDate: moment().subtract(4, 'd').format('YYYY-MM-DDT00:00'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Елабуга',
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
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(adminId)
            );
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, lastTrackerCarInfo[0].fixedAt, lastTrackerCarInfo[0].location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates, bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates, bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "04:00:00") //делаем 3 посещения через точки
            await page.waitForTimeout(75000);// жду пока пройдёт перерасчёт
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            const getBidPointIdVisits = await clienApi.GetObjectResponse(
                `${process.env.url}/api/truckingbids/getBidPointVisits?$filter=bidPointId eq ${bidInfoResponse.bidPoints[0].id}`,
                await getAuthData(adminId)
            );
            const closestVisit = findClosestVisitToPlanDate(getBidPointIdVisits, bidInfoResponse.bidPoints[0].planEnterDateOffset);
            console.log(closestVisit);
            //TODO доделать проверку на вторую точку и в идеале СРку добавить и т д
            await expect(page.locator('[data-test-id="point-auto-enter-date"]').first()).toContainText(moment(closestVisit.enterDate).format("DD.MM.YYYY HH:mm") as string)
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});