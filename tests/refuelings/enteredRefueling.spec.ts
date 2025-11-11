import { test } from '@playwright/test';
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
const inPlanningRefueling = [52.460818, 56.194695]
const outOfPlanning = [52.453428, 56.198075]
const adminId = 1319341 //переделать чтоб доставал из логина в фронте
test.describe('АЗС тесты', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание заявки с АЗС', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z and lastFixedAt le ${moment().subtract(2, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Челны',
                unloadAddress: 'Можга',
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
            await page.locator("//div[@class='dropdown__btn']").click();
            await page.locator(`//div[@class="dropdown__item"][contains(text(),'Запланировать заправки')]`).click();
            await page.locator('input[name="fuelConsumption"]').first().fill('33')
            await page.locator('input[name="minimumVolume"]').first().fill('200')
            await page.locator('input[name="currentVolume"]').first().fill('250')
            await page.locator('input[name="totalVolume"]').first().fill('800')
            await page.locator('input[name="minimumVolumeInFinishDesired"]').first().fill('750')
            await page.locator("//div[@class='btn-brand ml-1 btn btn-sm']").click();

            await page.locator("//div[@class='dropdown__btn']").click();
            await page.locator(`//div[@class="dropdown__item"][contains(text(),'Перерасчет')]`).click();
            await page.locator("//div[@class='btn btn-brand btn-sm modal-window__footer-action']").click();
            await page.locator("//DIV[@class='message'][text()='Ваш запрос выполнен успешно.']").isVisible();
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(adminId)
            );

            const planningRefuelingsArray = await clienApi.GetObjectResponse(
                `${process.env.url}/api/refueling/getPlannedRefuelings/${bidResponse.id}`,
                await getAuthData(adminId)
            );

            if (bidInfoResponse.bidPoints.length > 2) {
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(1, 'd').format("YYYY-MM-DDTHH:mm:ss+03:00"), lastTrackerCarInfo[0].location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates],
                    [
                        { Number: 7, Address: 65535, Value: 200, ChangePer100Km: 0 },
                    ], "00:20:00")
            }
            else {
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(1, 'd').format("YYYY-MM-DDTHH:mm:ss+03:00"), lastTrackerCarInfo[0].location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates, planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates],
                    [
                        { Number: 7, Address: 65535, Value: 200, ChangePer100Km: 0 },
                    ], "00:20:00")
            }
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates, [
                planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates,
                inPlanningRefueling
            ],
                [
                    { Number: 7, Address: 65535, Value: 180, ChangePer100Km: 0 },
                ],
                "00:02:00")
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates, [
                planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates, inPlanningRefueling
            ],
                [
                    { Number: 7, Address: 65535, Value: 700, ChangePer100Km: 0 },
                ],
                "00:02:00")
            await page.waitForTimeout(310000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'm').format("YYYY-MM-DDTHH:mm:ss+03:00"), planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates, [
                planningRefuelingsArray.plannedRefuelings[planningRefuelingsArray.plannedRefuelings.length - 1].mapObject.location.coordinates, outOfPlanning
            ],
                [
                    { Number: 7, Address: 65535, Value: 680, ChangePer100Km: 0 },
                ],
                "00:02:00")
        })
        await test.step('Проверяю что определился факт заправки на АЗС', async () => {
            const beforeRefuelingFact = '180';

            const locatorBeforeRefueling = page.locator('.b-timeline-point__date--value', { hasText: beforeRefuelingFact });

            // Проверка, существует ли такой элемент
            const countBeforeRefueling = await locatorBeforeRefueling.count();

            if (countBeforeRefueling > 0) {
                console.log(`есть факт заправки до на ${beforeRefuelingFact}`);
            } else {
                throw new Error(`не зафиксирована факт заправка до`)
            }

            const afterRefuelingFact = '700';

            const locatorAfterRefueling = page.locator('.b-timeline-point__date--value', { hasText: afterRefuelingFact });

            // Проверка, существует ли такой элемент
            const countAfterRefueling = await locatorAfterRefueling.count();

            if (countAfterRefueling > 0) {
                console.log(`есть факт заправки до на ${afterRefuelingFact}`);
            } else {
                throw new Error(`не зафиксирована факт заправка после`)
            }


            const refuelingFact = '520';

            const locatorRefueling = page.locator('.b-timeline-point__date--value', { hasText: refuelingFact });

            // Проверка, существует ли такой элемент
            const countRefueling = await locatorRefueling.count();

            if (countRefueling > 0) {
                console.log(`есть факт заправки до на ${refuelingFact}`);
            } else {
                throw new Error(`не зафиксирована факт заправка после`)
            }
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
