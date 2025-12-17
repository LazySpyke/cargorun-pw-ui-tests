import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
import DebugAPIRequestsClient from '../../api/debugRequests'
const debugApi = new DebugAPIRequestsClient();
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
let bidInfo: any;
const azcCoordinate: number[] = [51.797082, 55.640817]
const inPlanningRefueling = [51.797460, 55.640870]
const outOfPlanning = [51.809522, 55.648804]
const adminId = process.env.refuelingAdminId //переделать чтоб доставал из логина в фронте
test.describe('АЗС тесты', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Посещение АЗС вне планирования', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(10, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z and lastFixedAt le ${moment().subtract(4, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Елабуга',
                unloadAddress: 'Челны, машиностроительна 91А',
                userIdForFilter: adminId,
                cargoOwnerFilter: '(isDeleted eq false)'
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
            await page.waitForTimeout(15000)
        });
        await test.step('Планирование заправок по заявке ', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(adminId)
            );
            const orderSort = bidInfoResponse.bidPoints.sort((a, b) => a.order - b.order);

            if (bidInfoResponse.bidPoints.length <= 2) {
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(1, 'd').format("YYYY-MM-DDTHH:mm:ss+03:00"), lastTrackerCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, azcCoordinate],
                    [
                        { Number: 7, Address: 65535, Value: 200, ChangePer100Km: 0 },
                    ], "00:20:00", null, moment().format("YYYY-MM-DDTHH:mm:ss+03:00"))
            }
            else {
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(1, 'd').format("YYYY-MM-DDTHH:mm:ss+03:00"), lastTrackerCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, orderSort[1].geozone.location.coordinates, azcCoordinate],
                    [
                        { Number: 7, Address: 65535, Value: 200, ChangePer100Km: 0 },
                    ], "00:20:00", null, moment().format("YYYY-MM-DDTHH:mm:ss+03:00"))
            }
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), azcCoordinate, [
                azcCoordinate,
                inPlanningRefueling
            ],
                [
                    { Number: 7, Address: 65535, Value: 180, ChangePer100Km: 0 },
                ],
                "00:02:00")
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), azcCoordinate, [azcCoordinate, inPlanningRefueling],
                [
                    { Number: 7, Address: 65535, Value: 700, ChangePer100Km: 0 },
                ],
                "00:02:00")
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), azcCoordinate, [
                azcCoordinate, outOfPlanning
            ],
                [
                    { Number: 7, Address: 65535, Value: 680, ChangePer100Km: 0 },
                ],
                "00:02:00")
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(5, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), outOfPlanning, [
                outOfPlanning, orderSort[bidInfoResponse.bidPoints.length - 1].geozone.location.coordinates
            ],
                [
                    { Number: 7, Address: 65535, Value: 650, ChangePer100Km: 0 },
                ], null, null, moment().format("YYYY-MM-DDTHH:mm:ss+03:00"))
            await debugApi.init();
            await debugApi.runTask('ICalculateBidRefuelingsOutsidePlanReminder', await getAuthData(process.env.rootId))
        })
        await test.step('Проверяю в отчёте что определилась как посещенная вне плана', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по АЗС"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]").click();
            await page.locator('[name="bidId"]').fill(`${bidResponse.id}`)
            await page.waitForTimeout(1500)
            await page.locator('#react-select-visitStatusInstance-placeholder').scrollIntoViewIfNeeded()
            await page.locator('#visitStatusInput').click();
            await page.getByRole('option', { name: 'Посещена без планирования' }).click();
            await page.waitForTimeout(5000);
            await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toBeVisible();
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
