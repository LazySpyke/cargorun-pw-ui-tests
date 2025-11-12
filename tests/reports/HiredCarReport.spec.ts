import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { BidPage } from '../../pages/BidsPage';
import { BidCreateInfo, gerateBidCreateInfo } from '../../pages/Fixtures';
import { getAuthData } from '../../database';
import APIRequestsClient from '../../api/clienApiRequsets';
const clienApi = new APIRequestsClient();
import moment from 'moment';
test.describe('Создание разных заявок с фронта', () => {
    let loginPage: LoginPage;
    let distributionIdFromUrl: any;
    let cargoOwnerForHiredCar: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки', async () => {
            const bidFixture = new BidCreateInfo(page);
            const bidPage = new BidPage(page);
            const bidInfo: gerateBidCreateInfo = await bidFixture.CommonBid();
            await bidPage.gotoDistribution();
            await bidPage.CreateCommonDistributionBid(bidInfo);
        });
        await test.step('редактирование заказа, выставляем что это наёмный тс', async () => {
            await page.locator("//div[@class='inline-btn inline-btn--edit']").click();
            await page.locator('[name="hasHiredCar"]').click();

            cargoOwnerForHiredCar = await clienApi.GetObjectResponse(
                `${process.env.url}/api/cargoOwnerDictionary/get?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=5&$skip=0&withDeleted=true`,
                await getAuthData(36)
            );
            await page.locator('#hiredCarCounterpartyIdContainer').first().click();
            await page.locator('#hiredCarCounterpartyIdContainer').first().type(cargoOwnerForHiredCar[2].name, { delay: 100 });
            await page.locator(`text=${cargoOwnerForHiredCar[2].name}`).nth(1).click();
            await page.locator('[name="hiredCarPrice"]').fill('50000')

            await page.locator('#hiredCarNdsTypeIdContainer').first().click();
            await page.locator('#hiredCarNdsTypeIdContainer').first().type('10%', { delay: 100 });
            await page.locator(`text='10%'`).nth(1).click();
            await page.locator('[type="submit"]').click();
            await page.locator("//DIV[@class='message'][text()='Ваш запрос выполнен успешно.']").click();
            await page.waitForTimeout(5000);
            const currentUrl = await page.url();
            distributionIdFromUrl = currentUrl.match(/\d+/g);
        })
        await test.step('Проверка данных в Отчет по учету наемных ТС ', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator(`[name='Отчет по учету наемных ТС']`).click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(3, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.waitForTimeout(25000);
            await page.locator('[name="id"]').fill(`${distributionIdFromUrl}`)
            await page.locator('[name="hiredCarCounterpartyName"]').fill(`${cargoOwnerForHiredCar[2].name}`)
            //TODO ожидаю фронт чтоб доделать
            // await expect(page.locator('[role="row"]').nth(1)).toContainText(`${distributionIdFromUrl}`) //id заказа
            await expect(page.locator('[role="row"]').nth(1)).toContainText(`${cargoOwnerForHiredCar[2].name}`) //перевозчик
            await expect(page.locator('[role="row"]').nth(1)).toContainText(`${100000 / 1.1}`) //цена без НДС цену делим на % ндса
        })
    });
});

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
