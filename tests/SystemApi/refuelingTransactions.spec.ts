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
import { faker } from '@faker-js/faker';
const emulatorApi = new SupportAPIRequestsClient();
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
let bidInfo: any;
const apiUse = new api();
const debugApi = new DebugAPIRequestsClient();
const randomCardName = faker.word.sample() + moment().format()
const adminId = process.env.refuelingAdminId //переделать чтоб доставал из логина в фронте
test.describe('Создание транзакций по азс', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let cardNumber: string;
    let planningRefuelingsArray: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание транзакций по токену по номеру трекера', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'h').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt ge ${moment().subtract(60, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
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
            await page.waitForTimeout(10000)
            // await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            planningRefuelingsArray = await clienApi.GetObjectResponse(
                `${process.env.url}/api/refueling/getPlannedRefuelings/${bidResponse.id}`,
                await getAuthData(adminId)
            );
            await page.waitForTimeout(60000)
            await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(adminId));
        })
        await test.step('отправка запроса', async () => {
            await apiUse.init();
            const patchPriceIndate = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": "",
                            "deviceNumber": `${bidInfo.carOption.carTracker}`,
                            "createdAt": `${moment().subtract(5, 'h').format("YYYY-MM-DDTHH:mm:ss")}`,
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
            console.log(patchPriceIndate)
            const patchPriceOutMinDate = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": "",
                            "deviceNumber": `${bidInfo.carOption.carTracker}`,
                            "createdAt": `${moment().subtract(5, 'h').subtract(10, 'm').format("YYYY-MM-DDTHH:mm:ss")}`,
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
            console.log(patchPriceOutMinDate)
            const patchPriceOutMaxDate = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": "",
                            "deviceNumber": `${bidInfo.carOption.carTracker}`,
                            "createdAt": `${moment().subtract(3, 'h').add(10, 'm').format("YYYY-MM-DDTHH:mm:ss")}`,
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
            console.log(patchPriceOutMaxDate)
            await debugApi.init();
            await page.waitForTimeout(35000);
            await debugApi.runTask('IAnalyzeRefuelingTransactionsReminder', await getAuthData(process.env.rootId))
            await page.waitForTimeout(35000);

            //TODO доделать завершение вручную и отредачить даты
        });
    })
    test('Создание транзакций по токену и номеру карты', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
        });
        await test.step('добавление топливной карты к машине', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(2, 'h').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and lastFixedAt ge ${moment().subtract(60, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Челны',
                unloadAddress: 'Можга',
                userIdForFilter: adminId,
                cargoOwnerFilter: '(isDeleted eq false)'
            });
            await bidApi.init();
            await page.goto(`${process.env.url}/fuel-cards/list?tab=cars`)
            await page.locator('#carIdContainer').click();
            await page.waitForTimeout(5000)
            await page.locator('#carIdInput').fill(bidInfo.carOption.number)
            await page.waitForTimeout(1500)
            await page.getByRole('option', {
                name: `${bidInfo.carOption.number}`
            }).nth(0).click();
            const exists = await page.getByText('Нет данных для отображения') !== null;

            if (exists) {
                // селектор найден
                console.log(`селектор найден`)
                await page.locator('[class="btn btn-brand btn-sm"]').click();
                await page.locator('[name="number"]').nth(1).fill(`${randomCardName}`)
                await page.locator('#typeContainer').nth(0).click();
                await page.getByRole('option', {
                    name: 'Лукойл'
                }).nth(2).click();
                await page.locator('#carIdContainer').nth(1).click();
                await page.waitForTimeout(5000)
                await page.locator('#carIdInput').nth(1).fill(bidInfo.carOption.number)
                await page.waitForTimeout(1500)
                await page.getByRole('option', {
                    name: `${bidInfo.carOption.number}`
                }).nth(0).click();
                await page.locator('[type="submit"]').click(); //создание и привязка карты
                await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            } else {
                // селектор не найден
                await page.getByText(`${bidInfo.carOption.number}`).click();
                cardNumber = await page.innerText('div[class="td"]');
                console.log(cardNumber)
            }
        })
        await test.step('создание заявки', async () => {
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
        })
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
            await page.waitForTimeout(10000)
            // await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            planningRefuelingsArray = await clienApi.GetObjectResponse(
                `${process.env.url}/api/refueling/getPlannedRefuelings/${bidResponse.id}`,
                await getAuthData(adminId)
            );
            await page.waitForTimeout(60000)
            await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(adminId));
        })
        await test.step('отправка запроса', async () => {
            await apiUse.init();
            const patchPriceIndate = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": `${randomCardName}`,
                            "deviceNumber": "",
                            "createdAt": `${moment().subtract(5, 'h').format("YYYY-MM-DDTHH:mm:ss")}`,
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
            console.log(patchPriceIndate)
            const patchPriceOutMinDate = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": `${randomCardName}`,
                            "deviceNumber": "",
                            "createdAt": `${moment().subtract(5, 'h').subtract(10, 'm').format("YYYY-MM-DDTHH:mm:ss")}`,
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
            console.log(patchPriceOutMinDate)
            const patchPriceOutMaxDate = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": `${randomCardName}`,
                            "deviceNumber": "",
                            "createdAt": `${moment().subtract(3, 'h').add(10, 'm').format("YYYY-MM-DDTHH:mm:ss")}`,
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
            console.log(patchPriceOutMaxDate)
            await debugApi.init();
            await page.waitForTimeout(35000);
            await debugApi.runTask('IAnalyzeRefuelingTransactionsReminder', await getAuthData(process.env.rootId))
            await page.waitForTimeout(35000);

            //TODO доделать завершение вручную и отредачить даты
        });

    })
});
test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
    await clienApi.getToken(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});

