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
test.describe('Планирование по машинам', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let newEntity: any;
    let newDriver: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Проверка сокетов', async ({ page }) => {
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
                price: 100000,
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
            await page.waitForTimeout(90000);
        });
        await test.step('открытие планирование и проверка работы сокета', async () => {
            await debugApi.deactivateCityPlanning(37, await getAuthData(adminId))
            await page.locator("//span[contains(text(),'Планирование')]").click()
            await page.locator('[title="По машинам"]').click();
            await page.locator('[class="b-filter__collapse-btn b-filter__collapse-btn--bottom"]').click();
            await page.locator('#carIdInput').click();
            await page.locator('#carIdInput').fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click();
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--small carnumber__wrap--yellow"]')).toBeVisible(); //статус машины
        })
        await test.step('Проверка отображения информации по расчётному времени', async () => {
            const estimatedDate = moment().add(4, 'd').format("YYYY-MM-DDTHH:mm:ss")
            const setBidEstimatedLeaveDate = await apiUse.postData(`${process.env.url}/api/truckingbids/setBidEstimatedLeaveDate`, {
                "isValid": true,
                "id": bidResponse.id,
                "date": estimatedDate,
                "comment": `comment${estimatedDate}`
            }, await getAuthData(adminId))
            await expect(page.locator("//small[@class='nowrap-text']")).toBeVisible();
            await expect(page.locator("//small[@class='nowrap-text']")).toContainText(`${moment(estimatedDate).format("DD.MM.YYYY HH:mm")} (+05:00)`)
            await page.locator('[class="nowrap-text"]').hover();
            await expect(page.locator("//em[@class='text-muted']")).toHaveText(`comment${estimatedDate}`)
            await page.locator("//span[contains(text(),'Раскрыть комментарии расчетной даты')]").click();
            await expect(page.locator("//div[@class='kek']//em[@class='text-muted']")).toHaveText(`comment${estimatedDate}`)
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
