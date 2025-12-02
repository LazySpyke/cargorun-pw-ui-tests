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
const adminId = 1305211
const bio = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    patronymic: faker.person.middleName(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    comment: `${moment().format()}Cсылки на документы`,
    id: 0
};
const secondBio = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    patronymic: faker.person.middleName(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    comment: `${moment().format()}Cсылки на документы`,
    id: 0
};
const itemChangeCoordinate = [44.086501999999996, 56.288985999999994]
test.describe('паралелльная перецепка', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    let newEntity: any;
    let newEntityForParallel: any;
    let newDriverForParallel: any;
    let newDriver: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('2 заявки с паралелльной перецепкой с факт датами', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('Создание водителей', async () => {
            await apiUse.init();
            newDriver = await apiUse.postData(`${process.env.url}/api/driver/apply`, bio, await getAuthData(adminId))
            newDriverForParallel = await apiUse.postData(`${process.env.url}/api/driver/apply`, secondBio, await getAuthData(adminId))
        })
        await test.step('создание и привязка новых машин', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(36), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
            newEntityForParallel = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(36), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
            await page.waitForTimeout(25000)
        })
        await test.step('Создание нулевых заявок', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(14, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(10, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Казань',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: adminId,
                driverFilter: `id eq ${await newDriver.id}`
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(10000);
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(12, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "15:30:00", 50)
            await page.waitForTimeout(60000)
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(12, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(8, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${newEntityForParallel.newCarId}`,
                loadAddress: 'Самара',
                unloadAddress: 'Елабуга',
                userIdForFilter: adminId,
                reuseCar: true,
                driverFilter: `id eq ${await newDriverForParallel.id}`
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(10000)
            await emulatorApi.coordinatSend(secondBidInfo.carOption.carTracker, moment().subtract(12, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "15:30:00", 50)
            await page.waitForTimeout(60000)
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(2, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Москва',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                reuseCar: true,
                driverFilter: `id eq ${await newDriver.id}`
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(10000);

        });
        await test.step('создание второй заявки где дата позже', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(9, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${newEntityForParallel.newCarId}`,
                loadAddress: 'Уфа',
                unloadAddress: 'Москва',
                userIdForFilter: adminId,
                reuseCar: true,
                driverFilter: `id eq ${await newDriverForParallel.id}`
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(10000)
        })
        await test.step('Создание параллельной перецепки', async () => {
            await page.waitForTimeout(10000)//ждём перерасчётов
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.locator('[class="dropdown__btn"]').click();
            await page.getByText('Смена составляющих заявки').click();
            await page.locator("//div[@class='btn btn-sm btn-brand']").click();
            await page.locator('#shiftCarIdInput').fill(`${newEntityForParallel.newCarNumber}`)
            await page.getByRole('option', { name: `${newEntityForParallel.newCarNumber}` }).click();
            await page.locator('#shiftDriverIdInput').fill(`${secondBio.lastName} ${secondBio.firstName} ${secondBio.patronymic}`)
            await page.getByRole('option', { name: `${secondBio.lastName} ${secondBio.firstName} ${secondBio.patronymic}` }).click();
            await page.locator('[name="pointElemGeozone_undefined"]').click();
            await page.locator('[class="map__picker-field map__picker-field--desktop"]').fill('Россия, Нижний Новгород, Александровская слобода, 46')
            await page.locator('[class="map__result-item"]').first().click()
            await page.locator('[class="btn btn-brand map__submit-btn"]').click();
            await page.locator('[name="radius"]').fill('500')
            await page.waitForTimeout(5000)
            await page.locator('[name="planEnterDate"]').fill(`${moment().subtract(3, 'd').format("DD.MM.YYYY HH:mm")}`)
            await page.waitForTimeout(5000)
            await expect(page.locator("//div[@class='card-header']")).toHaveText('Вы можете связать точку перецепки с заявкой. При выполнении перецепки заявки поменяются указанными составляющими.')
            await page.locator("//div[@class='inline-btn inline-btn--checkmark']").click();
            await page.locator("//input[@value='Сохранить']").click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            // await expect(page.getByTestId('fact-empty-mileage-distance')).toHaveText('676')
        })
        await test.step('отправка координат', async () => {
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(6, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, itemChangeCoordinate, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "15:30:00", 50)
            await page.waitForTimeout(60000)
            await emulatorApi.coordinatSend(secondBidInfo.carOption.carTracker, `${moment().subtract(6, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, itemChangeCoordinate, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "15:30:00", 50)
            await page.waitForTimeout(60000)
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
