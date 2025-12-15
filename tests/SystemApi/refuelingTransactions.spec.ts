import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import api from '../../api/apiRequests';
const clienApi = new APIRequestsClient();
const apiUse = new api();
const adminId = 1319341 //переделать чтоб доставал из логина в фронте
test.describe('Создание транзакций по азс', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание транзакций по токену', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
        });
        await test.step('отправка запроса', async () => {
            await apiUse.init();
            const patchPrice = await apiUse.postData(`${process.env.url}/api/refuelingTransactions/create`,
                {
                    "transactions": [
                        {
                            "cardNumber": "",
                            "deviceNumber": "tracker51134838",
                            "createdAt": "2025-12-01T12:34:23",
                            "externalId": "1236t23452",
                            "volume": 123331,
                            "cost": 123.78,
                            "description": "важней всего погода в доме",
                            "address": "dom",
                            "x": 37.5,
                            "y": 55.9
                        }
                    ]
                }
                , await getAuthData(adminId))
            console.log(patchPrice)
        });

    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.cargorunRefPlanningLogin as string, process.env.cargorunRefPlanningPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
