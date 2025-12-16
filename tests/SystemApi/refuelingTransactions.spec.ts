import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
import api from '../../api/apiRequests';
import DebugAPIRequestsClient from '../../api/debugRequests'
const emulatorApi = new SupportAPIRequestsClient();
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
let bidInfo: any;
const apiUse = new api();
const debugApi = new DebugAPIRequestsClient();
const adminId = 1319341 //переделать чтоб доставал из логина в фронте
test.describe('Создание транзакций по азс', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let planningRefuelingsArray: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание транзакций по токену', async ({ page }) => {
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
            await expect(page.getByText('Запущен процесс планирования заправок.')).toBeVisible();
            await page.locator("//div[@class='dropdown__btn']").click();
            await page.locator(`//div[@class="dropdown__item"][contains(text(),'Перерасчет')]`).click();
            await page.locator("//div[@class='btn btn-brand btn-sm modal-window__footer-action']").click();
            // await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            planningRefuelingsArray = await clienApi.GetObjectResponse(
                `${process.env.url}/api/refueling/getPlannedRefuelings/${bidResponse.id}`,
                await getAuthData(adminId)
            );
        })
        await test.step('отправка запроса', async () => {
            await apiUse.init();
            const patchPrice = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": "",
                            "deviceNumber": `${bidInfo.carOption.carTracker}`,
                            "createdAt": `${moment().subtract(4, 'h').format("YYYY-MM-DDTHH:mm:ss")}`,
                            "externalId": `${bidInfo.carOption.carTracker}${moment().format("YYYY-MM-DDTHH:mm:ss")}`,
                            "volume": 300,
                            "cost": 65.5,
                            "description": `тест по заявке ${bidResponse.id}`,
                            "address": `тестовый адресс`,
                            "x": planningRefuelingsArray.plannedRefuelings[0].mapObject.location.coordinates[1],
                            "y": planningRefuelingsArray.plannedRefuelings[0].mapObject.location.coordinates[0]
                        }
                    ]
                }
                , await getAuthData(adminId))
            console.log(patchPrice)
            await debugApi.init();
            await page.waitForTimeout(5000);
            await debugApi.runTask('IAnalyzeRefuelingTransactionsReminder', await getAuthData(36))
            await page.waitForTimeout(5000);

            //TODO доделать завершение вручную и отредачить даты
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
