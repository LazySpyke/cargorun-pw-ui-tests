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

test.describe('Create Bid', () => {
    let loginPage: LoginPage;
    let bidInfo: any;
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
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(6, 'h').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(36)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(36));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(36));
            await bidApi.setStatus(bidResponse.id, await getAuthData(36));
            await emulatorApi.init();
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, null, null, [[
                49.266643326,
                55.673454156
            ]], [
                { Number: 7, Address: 65530, Value: 21, ChangePer100Km: 0 },
                { Number: 7, Address: 65531, Value: 22, ChangePer100Km: 0 },
                { Number: 7, Address: 65532, Value: 23, ChangePer100Km: 0 },
                { Number: 7, Address: 65533, Value: 25, ChangePer100Km: 0 },
                { Number: 5, Address: 65530, Value: 274, ChangePer100Km: 33 },
                // температуру и одометр можно оставить
                { Number: 6, Address: 65530, Value: 275, ChangePer100Km: 33 },
                { Number: 2, Address: 65531, Value: 100000, ChangePer100Km: 0 },
            ], "00:00:01")
            const response = await bidApi.GetCarsList(bidInfo.carOption.carId, await getAuthData(36), 37)
            setTimeout(() => {
                if (response[0].axisLoadValue.value != 21 ||
                    response[0].axisLoadValue.secondaryValue != 22 ||
                    response[0].axisLoadValue.averageValue != 23 ||
                    response[0].axisLoadValue.trailerValue != 25 ||
                    response[0].temperatureValue.values[0] != 1 ||
                    response[0].temperatureValue.values[1] != 2
                ) {
                    throw new Error('значения по датчикам не соотвестуют ожидаемым');
                }
                else {
                    console.log(`данные верны`)
                }
            }, 5000);
            await page.waitForTimeout(5000);
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
