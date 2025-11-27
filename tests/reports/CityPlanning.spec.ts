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
const adminId = 36
const bio = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    patronymic: faker.person.middleName(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    comment: `${moment().format()}Cсылки на документы`,
    id: 0
};
test.describe('Планирование по городам', () => {
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
            await page.waitForTimeout(5000)
            await page.locator('[class="icon-uEA88-info-circle text-info pr-2"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]')).toContainText(bookingComment)
        })
        await test.step('сокет редактирования необходимости ТО машины', async () => {
            const needsMaintenanceComment = `Необхордимость ТО в ${moment().format()}`
            const carInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/car/getForEdit?id=${newEntity.newCarId}`,
                await getAuthData(adminId)
            )
            carInfo.needsMaintenanceComment = needsMaintenanceComment
            const applyCar = await apiUse.postData(`${process.env.url}/api/car/apply`, carInfo, await getAuthData(adminId))
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            await page.waitForTimeout(5000)
            await expect(page.locator('[class="pr-2 icon-uEA97-wrench text-muted"]')).toBeVisible();
            await page.locator('[class="carnumber__number carnumber__number--without-region py-1"]').first().hover();
            await page.locator('[class="pr-2 icon-uEA97-wrench text-muted"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]').nth(1)).toContainText(needsMaintenanceComment)
        })
        await test.step('сокет редактирования водителя', async () => {
            const editbio = {
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                patronymic: faker.person.middleName(),
                phoneNumber: faker.phone.number({ style: 'international' }),
                comment: `${moment().format()}Cсылки на документы`,
                id: 0
            };
            const driverInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/getForEdit?id=${newDriver.id}`,
                await getAuthData(adminId)
            )
            const oldDriverName = driverInfo.firstName
            driverInfo.firstName = editbio.firstName
            const applyDriver = await apiUse.postData(`${process.env.url}/api/driver/apply`, driverInfo, await getAuthData(adminId))
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            await page.waitForTimeout(5000)
            await page.locator('[class="carnumber__number carnumber__number--without-region py-1"]').first().hover();
            await page.locator("//div[contains(text(),'Планирование по городам')]").click();
            await page.waitForTimeout(10000)
            await page.locator('[class="carnumber__number"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]').nth(0)).toContainText(`${editbio.firstName}`) //измененённое имя
            await expect(page.locator('[class="rc-tooltip-inner"]').nth(0)).not.toContainText(`${oldDriverName}`) //старое имя
        })
        await test.step('сокет редактирования прицепа', async () => {
            const editTrailerNumber = await emulatorApi.generateCarNumber()
            const trailerInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/trailer/getForEdit?id=${bidInfo.trailerOption.trailerId}`,
                await getAuthData(adminId)
            )
            const oldTrailerNumber = trailerInfo.number
            trailerInfo.number = editTrailerNumber
            const applyTrailer = await apiUse.postData(`${process.env.url}/api/trailer/apply`, trailerInfo, await getAuthData(adminId))
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            await page.waitForTimeout(5000)
            await page.locator('[class="carnumber__number carnumber__number--without-region py-1"]').first().hover();
            await page.locator("//div[contains(text(),'Планирование по городам')]").click();
            await page.waitForTimeout(5000)
            await page.locator('[class="carnumber__number"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]').nth(0)).toContainText(`${editTrailerNumber}`) //измененённый прицеп
            await expect(page.locator('[class="rc-tooltip-inner"]').nth(0)).not.toContainText(`${oldTrailerNumber}`) //старый номер прицепа
        })
        await test.step('сокет редактирования машины', async () => {
            const editCarNumber = await emulatorApi.generateCarNumber()
            const carInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/car/getForEdit?id=${newEntity.newCarId}`,
                await getAuthData(adminId)
            )
            carInfo.number = editCarNumber
            const applyCar = await apiUse.postData(`${process.env.url}/api/car/apply`, carInfo, await getAuthData(adminId))
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            const carSelector: string = await page.locator('[class="carnumber__number"]').first().innerText(); //получаем кол-вол заявок
            const carRegionText: string = await page.locator('[class="carnumber__region carnumber__region--small"]').first().innerText(); //получаем кол-вол заявок
            const allcarText = carSelector + carRegionText
            if (allcarText.replace(/\D/g, '') != editCarNumber.replace(/\D/g, '')) {
                throw new Error(`номер машины не обновился ожидаемый ${editCarNumber.replace(/\D/g, '')}, приходит ${allcarText.replace(/\D/g, '')}`)
            }
            else {
                console.log(`всё в кайф`)
            }
        })
        await test.step('сокет редактирования логиста машины', async () => {
            const carInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/car/getForEdit?id=${newEntity.newCarId}`,
                await getAuthData(adminId)
            )
            carInfo.logistId = 427
            const applyCar = await apiUse.postData(`${process.env.url}/api/car/apply`, carInfo, await getAuthData(adminId))
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--yellow"]')).toBeHidden(); //статус машины
            await expect(page.locator('[class="carnumber__wrap carnumber__wrap--lightgray"]')).toBeVisible(); //смена статуса в реалтайм по сокету на забронированно
            await expect(page.locator('[class="icon-uEA88-info-circle text-info pr-2"]')).toBeVisible(); //знак коммента
            await page.locator('[class="carnumber__number"]').hover();
            await expect(page.locator('[class="rc-tooltip-inner"]')).toContainText(`Тестовый Логист перезагрузить`)
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
