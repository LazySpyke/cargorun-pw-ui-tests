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
import { text } from 'stream/consumers';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
const apiUse = new api();
let bidInfo: any;
const adminId = 36
const bio = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    patronymic: faker.person.middleName(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    comment: `${moment().format()}Cсылки на документы`,
    id: 0
};
test.describe('Проверка работы сокета планирования', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    let newEntity: any;
    let newDriver: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Создание обычной заявки', async ({ page }) => {
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
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(36), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
            console.log(newEntity)
            await page.waitForTimeout(25000)
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
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
            await page.waitForTimeout(50000);
        });
        // await test.step('создание второй заявки где дата позже', async () => {
        //     const bidFixture = new BidCreateInfo(page);
        //     secondBidInfo = await bidFixture.ApiCommonBid({
        //         price: 100000,
        //         paymentTypeId: 176,
        //         ndsTypeId: 175,
        //         planEnterLoadDate: moment().subtract(4, 'd').format('YYYY-MM-DDTHH:mm'),
        //         planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
        //         carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
        //         loadAddress: 'Набережные Челны',
        //         unloadAddress: 'Нижний Новгород',
        //         userIdForFilter: adminId,
        //         reuseCar: true,
        //         driverFilter: `id eq ${await newDriver.id}`
        //     });
        //     await bidApi.init();
        //     secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
        //     await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
        //     secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
        //     await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, null, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates, secondBidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "05:30:00")
        //     //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
        //     await page.waitForTimeout(54000)
        // })
        await test.step('открытие планирование и проверка работы сокета', async () => {
            await debugApi.deactivateCityPlanning(37, await getAuthData(adminId))
            await page.locator("//span[contains(text(),'Планирование')]").click()
            await page.locator('[title="По городам"]').click();
            await page.locator('[class="b-filter__collapse-btn b-filter__collapse-btn--bottom"]').click();
            await page.locator('#carIdInput').click();
            await page.locator('#carIdInput').fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click();
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeVisible(); //статус машины
        })
        await test.step('сокет бронирования', async () => {
            const bookingComment = `бронь в ${moment().format()}`
            const applyBookingComment = await apiUse.postData(`${process.env.url}/api/car/applyBookingComment`, {
                "isValid": true,
                "id": newEntity.newCarId,
                "bookingComment": bookingComment
            }, await getAuthData(adminId))
            console.log(applyBookingComment)
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await page.locator('[class="icon-uEA81-lock text-muted"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]')).toContainText(bookingComment)
        })
        await test.step('сокет комментария', async () => {
            const bookingComment = `комментарий в ${moment().format()}`
            const applyBookingComment = await apiUse.postData(`${process.env.url}/api/car/applyPlanningComment`, {
                "isValid": true,
                "id": newEntity.newCarId,
                "planningComment": bookingComment
            }, await getAuthData(adminId))
            console.log(applyBookingComment)
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            await page.locator('[class="icon-uEA88-info-circle text-info pr-2"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]')).toContainText(bookingComment)
        })
        await test.step('сокет редактирования расчётного времени', async () => {
            const estimatedDate = moment().add(4, 'd').format("YYYY-MM-DDTHH:mm:ss")
            // const countBidInDate: string = await page.locator('[role="columnheader"]').nth(6).innerText(); //получаем кол-вол заявок
            // const splitText: any[] = countBidInDate.split(' ')
            // console.log(splitText)
            // const bidCount = splitText[1].replace(/\D/g, '');
            const setBidEstimatedLeaveDate = await apiUse.postData(`${process.env.url}/api/truckingbids/setBidEstimatedLeaveDate`, {
                "isValid": true,
                "id": bidResponse.id,
                "date": estimatedDate,
                "comment": null
            }, await getAuthData(adminId))
            console.log(setBidEstimatedLeaveDate)
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            await expect(page.locator('[role="columnheader"]').nth(6)).toHaveText(`${moment(estimatedDate, "YYYY-MM-DDTHH:mm:ss").format("DD.MM.YYYY")} (1)`) //ожидаем что станет на 1 больше
            await expect(page.locator('[aria-describedby=":rc22:"]')).toHaveText(moment(estimatedDate, "YYYY-MM-DDTHH:mm:ss").format("HH:mm"))
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
