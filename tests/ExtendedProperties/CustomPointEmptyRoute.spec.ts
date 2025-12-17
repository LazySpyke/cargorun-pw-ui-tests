import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import DebugAPIRequestsClient from '../../api/debugRequests'
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
let bidInfo: any;
const adminId = process.env.compoundAdminId
test.describe('Проверка отчётов с данными одометра', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let newEntity: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(6, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('Ввод данных по кастомным полям', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('//DIV[@class="inline-btn inline-btn--plus"][text()="Произвольная точка"]').click();
            await page.locator('#customPointTypeIdContainer_1').click();
            await page.locator('#typeIdContainer').first().type("Граница", { delay: 100 });
            await page.locator(`text=Граница`).nth(1).click();
            await page.locator('input[name="pointElemGeozone_1"]').click();
            await page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill('Ижевск')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator('[class="leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive"]').isVisible();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await page.locator('input[name="planEnterDate_1"]').fill(moment().subtract(9, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[name="planLeaveDate_1"]').fill(moment().subtract(9, 'd').add(1, 'h').format("DD.MM.YYYY HH:mm"))
            await page.locator('[class="book-form__section-arrow book-form__section-arrow--top"]').nth(0).click();
            await page.waitForTimeout(5000);
            await page.locator('//DIV[@class="inline-btn inline-btn--plus"][text()="Произвольная точка"]').click();
            await page.locator('#customPointTypeIdContainer_2').click();
            await page.locator('#typeIdContainer').first().type("Таможня", { delay: 100 });
            await page.locator(`text=Таможня`).nth(1).click();
            await page.locator('input[name="pointElemGeozone_2"]').click();
            await page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill('Самара')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator('[class="leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive"]').isVisible();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await page.locator('input[name="planEnterDate_2"]').fill(moment().subtract(2, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[name="planLeaveDate_2"]').fill(moment().subtract(2, 'd').add(1, 'h').format("DD.MM.YYYY HH:mm"))
        })
        await test.step('Заполнение ExtendedProperties', async () => {
            await page.locator('[name="DateTimeWithoutTimezone"]').first().fill(moment().subtract(1, 'd').format("DD.MM.YYYY 00:10"))
            await page.locator('[name="EPInterer"]').first().fill('10')
            await page.locator('[name="EPDouble"]').first().fill('50.5')
            await page.locator('[name="EPstring"]').first().fill('string')
            await page.locator('[name="EPDateTime"]').first().fill(moment().subtract(2, 'd').format("DD.MM.YYYY 00:10"))

            await page.locator('[name="DateTimeWithoutTimezone"]').nth(2).fill(moment().add(1, 'd').format("DD.MM.YYYY 05:10"))
            await page.locator('[name="EPInterer"]').nth(2).fill('20')
            await page.locator('[name="EPDouble"]').nth(2).fill('100.07')
            await page.locator('[name="EPstring"]').nth(2).fill('SecondString')
            await page.locator('[name="EPDateTime"]').nth(2).fill(moment().add(2, 'd').format("DD.MM.YYYY 05:10"))

            await page.locator('[name="DateTimeWithoutTimezone"]').nth(3).fill(moment().add(10, 'd').format("DD.MM.YYYY 09:10"))
            await page.locator('[name="EPInterer"]').nth(3).fill('30')
            await page.locator('[name="EPDouble"]').nth(3).fill('200.01')
            await page.locator('[name="EPstring"]').nth(3).fill('PointString')
            await page.locator('[name="EPDateTime"]').nth(3).fill(moment().add(20, 'd').format("DD.MM.YYYY 15:10"))

            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(5000);
        })
        await test.step('проверка данных в заявке', async () => {
            await page.locator('[class="b-timeline-point__more-link"]').first().click();
            await expect(page.locator('[data-point-extended-props="0"]').first()).toHaveText(`EPDateTime: ${moment().subtract(2, 'd').format("DD.MM.YYYY 00:10")}`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(1)).toHaveText(`DateTimeWithoutTimezone: ${moment().subtract(1, 'd').format("DD.MM.YYYY 00:10")}`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(2)).toHaveText(`EPInterer: 10`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(3)).toHaveText(`EPstring: string`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(4)).toHaveText(`EPDouble: 50.5`)


            await page.locator('[class="b-timeline-point__more-link"]').nth(2).click();
            await expect(page.locator('[data-point-extended-props="2"]').first()).toHaveText(`EPDateTime: ${moment().add(2, 'd').format("DD.MM.YYYY 05:10")}`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(1)).toHaveText(`DateTimeWithoutTimezone: ${moment().add(1, 'd').format("DD.MM.YYYY 05:10")}`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(2)).toHaveText(`EPInterer: 20`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(3)).toHaveText(`EPstring: SecondString`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(4)).toHaveText(`EPDouble: 100.07`)


            await page.locator('[class="b-timeline-point__more-link"]').nth(3).click();
            await expect(page.locator('[data-point-extended-props="3"]').first()).toHaveText(`EPDateTime: ${moment().add(20, 'd').format("DD.MM.YYYY 15:10")}`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(1)).toHaveText(`DateTimeWithoutTimezone: ${moment().add(10, 'd').format("DD.MM.YYYY 09:10")}`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(2)).toHaveText(`EPInterer: 30`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(3)).toHaveText(`EPstring: PointString`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(4)).toHaveText(`EPDouble: 200.01`)
        })
        await test.step('передвижение точки и повторная сверка данных', async () => {
            await page.locator('[class="font-size-10 text-muted icon-uEA07-delite"]').click();
            await page.dragAndDrop('//div[@class="leaflet-marker-icon route-icon leaflet-zoom-animated leaflet-interactive leaflet-marker-draggable"][text()="0A"]', '//div[@class="leaflet-marker-icon route-icon leaflet-zoom-animated leaflet-interactive leaflet-marker-draggable"][text()="0A"]', {
                targetPosition: { x: 10, y: 20 }
            })
            await page.locator('[value="Принять"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(6000);

            await page.dragAndDrop('//div[@class="leaflet-marker-icon route-icon leaflet-zoom-animated leaflet-interactive leaflet-marker-draggable"][text()="B"]', '//div[@class="leaflet-marker-icon route-icon leaflet-zoom-animated leaflet-interactive leaflet-marker-draggable"][text()="B"]', {
                targetPosition: { x: 10, y: 20 }
            })
            await page.locator('[value="Принять"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(6000);


            await page.dragAndDrop('//div[@class="leaflet-marker-icon route-icon leaflet-zoom-animated leaflet-interactive leaflet-marker-draggable"][text()="C"]', '//div[@class="leaflet-marker-icon route-icon leaflet-zoom-animated leaflet-interactive leaflet-marker-draggable"][text()="C"]', {
                targetPosition: { x: 10, y: 20 }
            })
            await page.locator('[value="Принять"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(6000);

            await page.locator('[class="b-timeline-point__more-link"]').first().click();
            await expect(page.locator('[data-point-extended-props="0"]').first()).toHaveText(`EPDateTime: ${moment().subtract(2, 'd').format("DD.MM.YYYY 00:10")}`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(1)).toHaveText(`DateTimeWithoutTimezone: ${moment().subtract(1, 'd').format("DD.MM.YYYY 00:10")}`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(2)).toHaveText(`EPInterer: 10`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(3)).toHaveText(`EPstring: string`)
            await expect(page.locator('[data-point-extended-props="0"]').nth(4)).toHaveText(`EPDouble: 50.5`)


            await page.locator('[class="b-timeline-point__more-link"]').nth(2).click();
            await expect(page.locator('[data-point-extended-props="2"]').first()).toHaveText(`EPDateTime: ${moment().add(2, 'd').format("DD.MM.YYYY 05:10")}`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(1)).toHaveText(`DateTimeWithoutTimezone: ${moment().add(1, 'd').format("DD.MM.YYYY 05:10")}`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(2)).toHaveText(`EPInterer: 20`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(3)).toHaveText(`EPstring: SecondString`)
            await expect(page.locator('[data-point-extended-props="2"]').nth(4)).toHaveText(`EPDouble: 100.07`)


            await page.locator('[class="b-timeline-point__more-link"]').nth(3).click();
            await expect(page.locator('[data-point-extended-props="3"]').first()).toHaveText(`EPDateTime: ${moment().add(20, 'd').format("DD.MM.YYYY 15:10")}`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(1)).toHaveText(`DateTimeWithoutTimezone: ${moment().add(10, 'd').format("DD.MM.YYYY 09:10")}`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(2)).toHaveText(`EPInterer: 30`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(3)).toHaveText(`EPstring: PointString`)
            await expect(page.locator('[data-point-extended-props="3"]').nth(4)).toHaveText(`EPDouble: 200.01`)
        })
        await test.step('Проверка данных в 1С', async () => {
            //TODo доделать проврку
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
    await clienApi.getToken(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
