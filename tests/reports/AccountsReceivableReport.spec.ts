import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();

test.describe('Отчёты по Дебиторской задолженности', () => {
    let loginPage: LoginPage;
    let bidInfo: any;
    let bidResponse: any;
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
                price: 75000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: 36,
                paymentStatus: {
                    "invoiceDate": moment().format("YYYY-MM-DD"),
                    "planPaymentDate": moment().add(1, 'd').format("YYYY-MM-DD"),
                    "factPaymentDate": null,
                    "paymentStatus": "PartiallyPaid",
                    "remainingPayment": 25000,
                    "comment": "Проверка автотеста",
                }
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
        });
        await test.step('Проверка отображения информации очастичной оплате', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator(`[name='Отчет "Дебиторская задолженность"']`).click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(5000);
            await page.locator('[class="badge badge-pill badge-warning"]')
            await expect(page.locator('[class="small"]')).toHaveText('Остаток оплаты: 25 000,00 ₽')
        });
    });
});

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
