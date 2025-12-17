import { faker } from '@faker-js/faker/locale/ru';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { getAuthData } from '../database';
import { BidCreateInfo } from '../pages/Fixtures';
import moment from 'moment';
import DebugAPIRequestsClient from '../api/debugRequests'
import APIRequestsClient from '../api/clienApiRequsets';
import api from '../api/apiRequests';
import APIBid from '../api/bidApi';
import SupportAPIRequestsClient from '../api/testSupportRequsets'
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
test.describe('Страница Мониторинг', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let newEntity: any;
    let newDriver: any;
    let newTrailer: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Заявки с фоновыми расходами', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание водителя', async () => {
            await emulatorApi.init();
            const trailer = {
                "isValid": true,
                "number": await emulatorApi.generateTrailerNumber(),
                "brandTypeId": process.env.trilerBrandTypeId,
                "typeId": process.env.trailerTypeId,
                "loadUnloadOptions": []
            }
            await apiUse.init();
            newDriver = await apiUse.postData(`${process.env.url}/api/driver/apply`, bio, await getAuthData(adminId))
            console.log(trailer)
            newTrailer = await apiUse.postData(`${process.env.url}/api/trailer/apply`, trailer, await getAuthData(adminId))
            console.log(newTrailer)
        })
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"), process.env.logistId)
            console.log(newEntity)
            await page.waitForTimeout(10000)
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(4, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                driverFilter: `id eq ${await newDriver.id}`,
                trailerFilter: `id eq ${await newTrailer.id}`
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "02:30:00")
            await page.waitForTimeout(10000);
        });
        await test.step('Проверка фильтрации', async () => {
            const filterLogist = await clienApi.GetObjectResponse(
                `${process.env.url}/api/adminpanel/getAllUsers?$filter=id eq ${bidInfo.carOption.carLogistId}&$orderby=id desc&$top=10&$skip=0`,
                await getAuthData(adminId))
            await page.locator('[title="Мониторинг"]').click();
            await page.locator('#car\\/logistIdInput').click()
            await page.locator('#car\\/logistIdInput').fill(`${filterLogist[0].fullName}`)
            await page.getByRole('option', {
                name: `${filterLogist[0].fullName}`
            }).click();
            await page.locator('[class="book-list__head-title"]').click();
            await page.waitForTimeout(500)
            await page.locator('#car\\/idContainer').click();
            await page.locator('#car\\/idInput').fill(`${bidInfo.carOption.number}`)
            await page.getByRole('option', {
                name: `${bidInfo.carOption.number}`
            }).click();
            await page.locator('[class="book-list__head-title"]').click();
            await page.waitForTimeout(500)
            await page.locator('#car\\/typeIdContainer').click();
            await page.locator('#car\\/typeIdInput').fill('OverallReport');
            await page.getByRole('option', {
                name: 'OverallReport'
            }).click();
            await page.locator('[class="book-list__head-title"]').click();
            await page.waitForTimeout(500)
            await page.locator('#trailerTypeIdsContainer').click();
            await page.locator('#trailerTypeIdsInput').fill('Тент')
            await page.getByRole('option', {
                name: 'Тент'
            }).first().click();
            await page.locator('[class="book-list__head-title"]').click();
            await page.waitForTimeout(60000)
            await page.reload()
            await page.locator('[class="leaflet-marker-icon map__icon map-icon map-icon--blue-track map-icon--car map-icon--car--green leaflet-zoom-animated leaflet-interactive"]').click()
            await expect(page.locator('[class="map__popup-wrapper"]')).toContainText(`${bidInfo.carOption.number}`)
            await expect(page.locator('[class="map__popup-wrapper"]')).toContainText(`${bio.lastName}`)
            await expect(page.locator('[class="map__popup-wrapper"]')).toContainText(`${newTrailer.number}`)
            await expect(page.locator('[class="c-dropd__list-item"]').nth(0)).toHaveText('Создать заявку для машины')
            await expect(page.locator('[class="c-dropd__list-item"]').nth(1)).toHaveText('Открыть текущую заявку')
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
