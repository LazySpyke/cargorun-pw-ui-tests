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
const adminId = process.env.refuelingAdminId //переделать чтоб доставал из логина в фронте
test.describe('АЗС тесты', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Удаление АЗС', async ({ page }) => {
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
            await page.waitForTimeout(10000);
            await page.locator("//div[@class='dropdown__btn']").click();
            await page.locator(`//div[@class="dropdown__item"][contains(text(),'Запланировать заправки')]`).click();
            await page.locator('input[name="fuelConsumption"]').first().fill('33')
            await page.locator('input[name="minimumVolume"]').first().fill('200')
            await page.locator('input[name="currentVolume"]').first().fill('250')
            await page.locator('input[name="totalVolume"]').first().fill('800')
            await page.locator('input[name="minimumVolumeInFinishDesired"]').first().fill('750')
            await page.locator("//div[@class='btn-brand ml-1 btn btn-sm']").click();
            await expect(page.getByText('Запущен процесс планирования заправок.')).toBeVisible();
            await page.waitForTimeout(10000);
            await page.reload()
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
        })
        await test.step('удаление АЗС', async () => {
            await expect(page.locator('[class="b-timeline-point__circle--text b-timeline-point__circle--refueling"]')).toBeVisible();
            if (bidInfoResponse.bidPoints.length > 2) { //проверяем есть ли нулевая
                await page.locator('[class="icon-uEA10-pen"]').nth(2).click();
                await page.getByText('Удалить заправку').click();
                await expect(page.getByText('Вы уверены, что хотите удалить заправку?')).toBeVisible();
                await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
                await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
                await expect(page.locator('[class="b-timeline-point__circle--text b-timeline-point__circle--refueling"]')).toBeHidden();
            }
            else {
                await page.locator('[class="icon-uEA10-pen"]').nth(1).click();
                await page.getByText('Удалить заправку').click();
                await expect(page.getByText('Вы уверены, что хотите удалить заправку?')).toBeVisible();
                await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
                await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
                await expect(page.locator('[class="b-timeline-point__circle--text b-timeline-point__circle--refueling"]')).toBeHidden();
            }
        })
        await test.step('Проверяем что в отчёте по АЗС будет информация по удалённой АЗС', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по АЗС"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('[class="btn btn-sm btn-brand"]').first().click();
            await page.locator('[name="bidId"]').fill(`${bidResponse.id}`)
            await page.waitForTimeout(1500)
            await page.locator('#react-select-visitStatusInstance-placeholder').scrollIntoViewIfNeeded()
            await page.locator('#visitStatusInput').click();
            await page.getByRole('option', { name: 'Удалена логистом' }).click();
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
