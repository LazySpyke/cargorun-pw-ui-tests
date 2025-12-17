import { expect, test } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/ru';
import { LoginPage } from '../../pages/LoginPage';
import { BidPage } from '../../pages/BidsPage';
import { BidCreateInfo, gerateBidCreateInfo } from '../../pages/Fixtures';
import { getAuthData } from '../../database';
import api from '../../api/apiRequests';
import APIRequestsClient from '../../api/clienApiRequsets';
const apiUse = new api();
const clienApi = new APIRequestsClient();
const randomInn = Math.floor(Math.random() * 999999999999) + 10000000000;

const newCargoOwner = {
    "isValid": true,
    "name": faker.company.name() + faker.company.name(),
    "inn": randomInn,
    "kpp": null,
    "platforms": []
}
import moment from 'moment';
test.describe('Отчёт по учёту наёмного ТС', () => {
    let loginPage: LoginPage;
    let distributionIdFromUrl: any;
    let cargoOwnerForHiredCar: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание заказов и проверка отчёта по наёмным ТС', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заказа без даты выполнения', async () => {
            const bidFixture = new BidCreateInfo(page);
            const bidPage = new BidPage(page);
            const bidInfo: gerateBidCreateInfo = await bidFixture.CommonBid();
            await bidPage.gotoDistribution();
            await bidPage.CreateCommonDistributionBid(bidInfo);
        });
        await test.step('редактирование заказа, выставляем что это наёмный тс', async () => {
            await page.locator("//div[@class='inline-btn inline-btn--edit']").click();
            await page.locator('[name="hasHiredCar"]').click();
            await apiUse.init();
            cargoOwnerForHiredCar = await apiUse.postData(`${process.env.url}/api/cargoOwnerDictionary/apply`, newCargoOwner, await getAuthData(process.env.rootId))
            console.log(cargoOwnerForHiredCar)
            await page.locator('#hiredCarCounterpartyIdContainer').first().click();
            await page.locator('#hiredCarCounterpartyIdContainer').first().type(newCargoOwner.name, { delay: 100 });
            await page.locator(`text=${newCargoOwner.name}`).nth(1).click();
            await page.locator('[name="hiredCarPrice"]').fill('75000')
            await page.locator('[name="hiredCarCompletedAt"]').fill(moment().subtract(1, 'd').format("DD.MM.YYYY 12:00"))
            await page.locator('#hiredCarNdsTypeIdContainer').first().click();
            await page.locator('#hiredCarNdsTypeIdContainer').first().type('10%', { delay: 100 });
            await page.locator(`text='10%'`).nth(1).click();
            await page.locator('[type="submit"]').click();
            await page.locator("//DIV[@class='message'][text()='Ваш запрос выполнен успешно.']").click();
            await page.waitForTimeout(5000);
            const currentUrl = await page.url();
            distributionIdFromUrl = currentUrl.match(/\d+/g);
        })
        await test.step('Создание заказа с датой выполнения', async () => {
            const bidFixture = new BidCreateInfo(page);
            const bidPage = new BidPage(page);
            const bidInfo: gerateBidCreateInfo = await bidFixture.CommonBid();
            await bidPage.gotoDistribution();
            await bidPage.CreateCommonDistributionBid(bidInfo);
        });
        await test.step('редактирование заказа, выставляем что это наёмный тс с датой выполнения', async () => {
            await page.locator("//div[@class='inline-btn inline-btn--edit']").click();
            await page.locator('[name="hasHiredCar"]').click();
            await apiUse.init();
            await page.locator('#hiredCarCounterpartyIdContainer').first().click();
            await page.locator('#hiredCarCounterpartyIdContainer').first().type(newCargoOwner.name, { delay: 100 });
            await page.waitForTimeout(5000)
            await page.locator("#hiredCarCounterpartyIdContainer").press('Enter')
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
            await page.locator('[name="hiredCarCounterpartyName"]').fill(`${newCargoOwner.name}`)
            //TODO ожидаю фронт чтоб доделать
            // await expect(page.locator('[role="row"]').nth(1)).toContainText(`${distributionIdFromUrl}`) //id заказа
            await expect(page.locator('[role="row"]').nth(1)).toContainText(`${newCargoOwner.name}`) //перевозчик
            const price: number = 100000
            const priceWithout: number = (price / 1.1)
            await expect(page.locator('[role="row"]').nth(1)).toContainText(`${priceWithout.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            })}`)
            await expect(page.locator('[role="row"]').nth(1)).toContainText('Набережные Челны - Казань') //маршрут
            await expect(page.locator('[role="row"]').nth(1)).toContainText(price.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            }))
            await expect(page.locator('[role="row"]').nth(1)).toContainText('10%')//ставка НДС
            const price_to_be_charged = price - priceWithout
            await expect(page.locator('[role="row"]').nth(1)).toContainText(price_to_be_charged.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            }))//цена с вычетом ндс
            await expect(page.locator('[role="row"]').nth(1)).toContainText('50 000,00')//Сумма перевозчику (с НДС), руб.

            const priceHired: number = 50000
            const priceHiredWithout: number = (priceHired / 1.1)

            await expect(page.locator('[role="row"]').nth(1)).toContainText(`${priceHiredWithout.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            })}`)
            const priceHired_to_be_charged = priceHired - priceHiredWithout
            await expect(page.locator('[role="row"]').nth(1)).toContainText(priceHired_to_be_charged.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            }))//цена с вычетом ндс
            const profitBeforeTax = (priceHiredWithout * 0.25)
            await expect(page.locator('[role="row"]').nth(1)).toContainText(profitBeforeTax.toLocaleString('ru-RU', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            }))//цена с вычетом ндс
            const marginality = (priceHired_to_be_charged / priceWithout) * 1000
            console.log(priceHired_to_be_charged, priceWithout, marginality)
            await expect(page.locator('[role="row"]').nth(1)).toContainText(marginality.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'decimal', // обычное число, без валюты
                useGrouping: true, // группировка тысяч
            }))//маржинальность
        })
        await test.step('проверка по группировке перевозчика', async () => {
            await page.waitForTimeout(1500)
            await page.getByText('Группировать по перевозчику').click();
            await page.locator('#counterpartyIdContainer').click();
            await page.locator('#counterpartyIdContainer').first().type(newCargoOwner.name as string)
            await page.waitForTimeout(2500)
            await page.locator("#counterpartyIdContainer").press('Enter')
            await page.waitForTimeout(2500)
            await expect(page.locator(`[data-profit="${cargoOwnerForHiredCar.id}"]`)).toHaveText('68 181,81')
            await expect(page.locator(`[data-marginality="${cargoOwnerForHiredCar.id}"]`)).toHaveText('37,50')
            await expect(page.locator(`[data-countofdistributionbids="${cargoOwnerForHiredCar.id}"]`)).toHaveText('2')
            await page.locator(`span[data-counterpartyname="${cargoOwnerForHiredCar.id}"]`).click();
        })

        //TODO сделать проверку по модалке
    });
});

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
