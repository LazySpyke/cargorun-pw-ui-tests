import { faker } from '@faker-js/faker/locale/ru';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import DebugAPIRequestsClient from '../../api/debugRequests'
import APIRequestsClient from '../../api/clienApiRequsets';
import api from '../../api/apiRequests';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
const apiUse = new api();
let bidInfo: any;
const adminId = process.env.rootId
const bio = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    patronymic: faker.person.middleName(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    comment: `${moment().format()}Cсылки на документы`,
    id: 0
};
test.describe('АРМ логиста', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let newEntity: any;
    let newDriver: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Проверка редактирования расчётного времени', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание водителя', async () => {
            await apiUse.init();
            newDriver = await apiUse.postData(`${process.env.url}/api/driver/apply`, bio, await getAuthData(adminId))
            console.log(newDriver)
        })
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
            console.log(newEntity)
            await page.waitForTimeout(25000)
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 50000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                driverFilter: `id eq ${await newDriver.id}`
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "02:30:00")
            await page.waitForTimeout(350000);
        });
        await test.step('Редактирование расчётного времени для активной заявки', async () => {
            await debugApi.deactivateCityPlanning(37, await getAuthData(adminId))
            await page.goto(`${process.env.url}/planning/trip-planning`);
            await page.waitForTimeout(5000)
            await page.locator('[class="planning-btn mr-2"]').click();
            await page.locator(`[id='car/idInput']`).click();
            await page.locator(`[id='car/idInput']`).fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click();
            await page.waitForTimeout(5000)
            await page.locator('[class="planning-btn mr-2 planning-btn--active"]').click();
            await expect(page.locator('[class="p-car p-car--not-planned"]')).toBeVisible(); //статус машины
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='td']//div[@class='d-inline-flex w-100']//*[name()='svg']").click(); //кнопка редактирования расчётной даты
            await page.locator('[name="date"]').fill(`${moment().format("DD.MM.YYYY HH:mm")}`)
            const forceEstimationEdit = `Автотест изменение расчётного времени ${moment().format()}`
            await page.locator('[name="comment"]').fill(forceEstimationEdit)
            await page.locator('[type="submit"]').click()
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="w-100"]').nth(2)).toContainText(`${moment().format("DD.MM.YYYY HH:mm")}`); //расчётная дата
            await page.locator("//div[@class='d-inline-flex w-100']//span[1]").hover();//наведение на данные расчётного времени
            await expect(page.locator('[class="rc-tooltip-inner"]')).toHaveText(forceEstimationEdit); //коммент
        })
        await test.step('Редактирование расчётного времени для заявки в статусе на выгрузке', async () => {
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(4, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "02:30:00")
            const recalcBid = await apiUse.postData(`${process.env.url}/api/truckingBids/addToRecalculation`, { "bids": [{ "id": `${bidResponse.id}`, "flags": 0 }] }, await getAuthData(adminId))
            await page.waitForTimeout(90000);
            await debugApi.deactivateCityPlanning(37, await getAuthData(adminId))
            await page.reload();
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="p-car p-car--unloading"]')).toBeVisible(); //статус машины
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='td']//div[@class='d-inline-flex w-100']//*[name()='svg']").click(); //кнопка редактирования расчётной даты
            await page.locator('[name="date"]').fill(`${moment().format("DD.MM.YYYY HH:mm")}`)
            const forceEstimationEditonUnload = `Автотест изменение расчётного времени ${moment().format()}`
            await page.locator('[name="comment"]').fill(forceEstimationEditonUnload)
            await page.locator('[type="submit"]').click()
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="w-100"]').nth(2)).toContainText(`${moment().format("DD.MM.YYYY HH:mm")}`); //расчётная дата
            await page.locator("//div[@class='d-inline-flex w-100']//span[1]").hover();//наведение на данные расчётного времени
            await expect(page.locator('[class="rc-tooltip-inner"]')).toHaveText(forceEstimationEditonUnload); //коммент
        })
        await test.step('Редактирование расчётного времени для заявки в статусе на без заявки', async () => {
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(2, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[1].geozone.location.coordinates, [bidInfoResponse.bidPoints[1].geozone.location.coordinates, bidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "02:30:00")
            const recalcBid = await apiUse.postData(`${process.env.url}/api/truckingBids/addToRecalculation`, { "bids": [{ "id": `${bidResponse.id}`, "flags": 0 }] }, await getAuthData(adminId))
            await page.waitForTimeout(350000);
            await debugApi.deactivateCityPlanning(37, await getAuthData(adminId))
            await page.reload();
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="p-car p-car--without-bid"]')).toBeVisible(); //статус машины
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='td']//div[@class='d-inline-flex w-100']//*[name()='svg']").click(); //кнопка редактирования расчётной даты
            await page.locator('[name="date"]').fill(`${moment().format("DD.MM.YYYY HH:mm")}`)
            const forceEstimationEditDone = `Автотест изменение расчётного времени ${moment().format()}`
            await page.locator('[name="comment"]').fill(forceEstimationEditDone)
            await page.locator('[type="submit"]').click()
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="w-100"]').nth(2)).toContainText(`${moment().format("DD.MM.YYYY HH:mm")}`); //расчётная дата
            await page.locator("//div[@class='d-inline-flex w-100']//span[1]").hover();//наведение на данные расчётного времени
            await expect(page.locator('[class="rc-tooltip-inner"]')).toHaveText(forceEstimationEditDone); //коммент
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
