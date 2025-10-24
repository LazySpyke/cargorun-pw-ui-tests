import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { getAuthData } from '../database';
import { BidCreateInfo } from '../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../api/clienApiRequsets';
import APIBid from '../api/bidApi';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
let bidInfo: any;
test.describe('Отслеживание треке почты России', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки и привязка трек-номера Почты России', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Москва',
                userIdForFilter: 36,
                cargoOwnerFilter: "(isDeleted eq false and contains(tolower(name),'проверка') and contains(tolower(inn),'7743343709'))"
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(36));
            await bidApi.setStatus(bidResponse.id, await getAuthData(36));
            await page.waitForTimeout(5000);
            await test.step('', async () => {
                await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
                await page.locator('[placeholder="Введите трек-код, например: LA0942127883SE"]').fill(process.env.parcelTrack as string)
                await page.locator("//button[@type='button']").click();
                await page.waitForSelector('[class="notification notification-success notification-enter-done"]', {
                    state: "visible"
                })
                await page.waitForSelector("//div[contains(text(),'Вручение(Адресату по QR коду)')]", {
                    state: 'visible'
                })
                await page.waitForSelector("//a[@class='btn btn-xs btn-outline-primary']", { state: 'visible' }) //кнопка подробнаяи инфа
            })
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});

test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
})
