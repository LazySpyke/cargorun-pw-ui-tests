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
test.describe('Документы заявки', () => {
    let loginPage: LoginPage
    let bidResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки с контрагентом содержащий реальный ИНН', async ({ page }) => {
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
            const bidListDriver = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=driverIds/any(driverids:driverids in (${bidInfo.driver.id}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(36)
            );
            bidListDriver.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(36));
            }); //отменяем заявки по водителю
            const bidListCar = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(36)
            );
            bidListCar.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(36));
            }); //отменяем заявки по машине
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(36));
            await bidApi.setStatus(bidResponse.id, await getAuthData(36));
            await page.waitForTimeout(5000);
            await test.step('Создание документ-заявки', async () => {
                await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
                await page.locator("//div[@class='show-bid__link d-inline-block']").click();
                await page.locator("//div[@class='btn btn-sm btn-brand']").click();
                await page.locator("#documentTemplateIdContainer").click();
                await page.locator('#documentTemplateIdContainer').first().type("Все теги", { delay: 100 });
                await page.locator(`text=Все теги`).nth(1).click();
                await page.locator("//div[@class='btn btn-sm btn-brand btn-block']").click();
                await page.waitForSelector('[class="icon-uEA79-spinner animation-rspin pr-1"]', {
                    state: 'visible'
                })
                await page.waitForSelector(`//td[contains(text(),'Создание документа Договор по заявке №${bidResponse.id}')]`, {
                    state: 'visible'
                })
            })
            await test.step('Создание счета', async () => {
                await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
                await page.locator("//div[@class='show-bid__link d-inline-block']").click();
                await page.locator("//div[contains(@class,'map-panels')]//div[2]").click();
                await page.waitForTimeout(1500);
                await page.locator("//div[contains(@class,'btn btn-sm btn-brand')]").click();

                await page.locator("#classificationTypeIdContainer").click();
                await page.locator('#classificationTypeIdContainer').first().type("Услуги по перевозке груза автотранспортом", { delay: 100 });
                await page.locator(`text=Услуги по перевозке груза автотранспортом`).nth(1).click();
                await page.locator("//div[@class='btn btn-sm btn-brand btn-block']").click();
                await page.locator("//div[@class='btn btn-brand btn-block']").click();
                await page.waitForSelector('[class="icon-uEA79-spinner animation-rspin pr-1"]', {
                    state: 'visible'
                })
                await page.waitForSelector(`//td[contains(text(),'Создание документа Счёт по заявке №${bidResponse.id}')]`, {
                    state: 'visible'
                })
            })
            await test.step('Создание Акта', async () => {
                await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
                await page.locator("//div[@class='show-bid__link d-inline-block']").click();
                await page.locator("//div[contains(@class,'map-panels')]//div[3]").click();
                await page.waitForTimeout(1500);
                await page.locator("//div[contains(@class,'btn btn-sm btn-brand')]").click();

                await page.locator("#classificationTypeIdContainer").click();
                await page.locator('#classificationTypeIdContainer').first().type("Услуги по перевозке груза автотранспортом", { delay: 100 });
                await page.locator(`text=Услуги по перевозке груза автотранспортом`).nth(1).click();
                await page.locator("//div[@class='btn btn-sm btn-brand btn-block']").click();
                await page.locator("//div[@class='btn btn-brand btn-block']").click();
                await page.waitForSelector('[class="icon-uEA79-spinner animation-rspin pr-1"]', {
                    state: 'visible'
                })
                await page.waitForSelector(`//td[contains(text(),'Создание документа Акт по заявке №${bidResponse.id}')]`, {
                    state: 'visible'
                })
            })
            await test.step('Создание Счет-Фактуры', async () => {
                await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
                await page.locator("//div[@class='show-bid__link d-inline-block']").click();
                await page.locator("//div[contains(@class,'map-panels')]//div[4]").click();
                await page.waitForTimeout(1500);
                await page.locator("//div[contains(@class,'btn btn-sm btn-brand')]").click();

                await page.locator("#classificationTypeIdContainer").click();
                await page.locator('#classificationTypeIdContainer').first().type("Услуги по перевозке груза автотранспортом", { delay: 100 });
                await page.locator(`text=Услуги по перевозке груза автотранспортом`).nth(1).click();
                await page.locator("//div[@class='btn btn-sm btn-brand btn-block']").click();
                await page.locator("//div[@class='btn btn-brand btn-block']").click();
                await page.waitForSelector('[class="icon-uEA79-spinner animation-rspin pr-1"]', {
                    state: 'visible'
                })
                await page.waitForSelector(`//td[contains(text(),'Создание документа Счёт-Фактура по заявке №${bidResponse.id}')]`, {
                    state: 'visible'
                })
            })
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
