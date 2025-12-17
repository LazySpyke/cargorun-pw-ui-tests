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
test.describe('Отчёт по доходам и расходам парка', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
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
                "brandTypeId": process.env.trailerBrandTypeId,
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
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
            console.log(newEntity)
            await page.waitForTimeout(10000)
        })
        await test.step('создание расходов на все 3 элемента', async () => {
            await page.locator('[title="Финансы и учет"]').click();
            await page.locator('[name="Общие расходы"]').click();

            //грузовик по км
            await page.locator("//a[@class='btn btn-brand btn-sm']").click();
            await page.locator('#resourceContainer').nth(1).click();
            await page.getByRole('option', { name: 'Грузовик' }).click();
            await page.locator('#carIdContainer').click();
            await page.locator('#carIdInput').fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click()
            await page.locator('#periodTypeContainer').nth(1).click()
            await page.getByRole('option', { name: 'По пробегу' }).click();
            await page.locator('[name="period"]').fill('100')
            await page.locator('#typeIdContainer').nth(1).click();
            await page.getByRole('option', { name: 'Топливо' }).click();
            await page.locator('[name="date"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(1).fill('33')
            await page.locator('[name="comment"]').fill(`тест во время ${moment().format()}`)
            await page.locator('[value="Сохранить"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();

            //грузовик по дате
            await page.locator("//a[@class='btn btn-brand btn-sm']").click();
            await page.locator('#resourceContainer').nth(1).click();
            await page.getByRole('option', { name: 'Грузовик' }).click();
            await page.locator('#carIdContainer').click();
            await page.locator('#carIdInput').fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click()
            await page.locator('#periodTypeContainer').nth(1).click()
            await page.getByRole('option', { name: 'По дате' }).click();
            await page.locator('[name="period"]').fill('1')
            await page.locator('#typeIdContainer').nth(1).click();
            await page.getByRole('option', { name: 'Компенсация' }).click();
            await page.locator('[name="date"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(1).fill('1000')
            await page.locator('[name="comment"]').fill(`тест во время ${moment().format()}`)
            await page.locator('[value="Сохранить"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await debugApi.runTask('IProcessCarExpensesReminderGrain', await getAuthData(process.env.rootId))
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
        await test.step('создание второй заявки где дата позже', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(1, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Набережные Челны',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: adminId,
                reuseCar: true,
                driverFilter: `id eq ${await newDriver.id}`
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, null, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates, secondBidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "05:30:00")
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(120000)
            await debugApi.runTask('IProcessCarExpensesReminderGrain', await getAuthData(process.env.rootId))
        })
        // await test.step('проверка данных заявок', async () => {
        //     await page.waitForTimeout(30000)//ждём перерасчётов
        //     await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
        //     await expect(page.getByTestId('fact-distance')).toHaveText('287')
        //     await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
        //     await expect(page.getByTestId('fact-distance')).toHaveText('651')
        //     // await expect(page.getByTestId('fact-empty-mileage-distance')).toHaveText('676')
        // })
    })
    test('Заявки с расходами по заявке', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание водителя', async () => {
            await emulatorApi.init();
            const trailer = {
                "isValid": true,
                "number": await emulatorApi.generateTrailerNumber(),
                "brandTypeId": process.env.trailerBrandTypeId,
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
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
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
        await test.step('создание второй заявки где дата позже', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(1, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Набережные Челны',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: adminId,
                reuseCar: true,
                driverFilter: `id eq ${await newDriver.id}`
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            // await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            // await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, null, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates, secondBidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "05:30:00")
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(30000)
        })
        await test.step('создание расходов на все 3 элемента на 1 заявку', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.getByText('Редактировать').first().click();
            //грузовик
            await page.getByText('Добавить расходы').click();
            await page.locator('#resourceContainer').nth(0).click();
            await page.getByRole('option', { name: 'Грузовик' }).click();
            await page.locator('#carIdContainer').click();
            await page.locator('#carIdInput').fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click()
            await page.locator('#typeIdContainer').nth(0).click();
            await page.getByRole('option', { name: 'Топливо' }).click();
            await page.locator('[name="date"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(0).fill('15000')
            await page.locator('[name="comment"]').nth(1).fill(`тест во время ${moment().format()}`)
            //прицеп
            await page.getByText('Добавить расходы').click();
            await page.locator('#resourceContainer').nth(1).click();
            await page.getByRole('option', { name: 'Прицеп' }).click();
            await page.locator('#trailerIdContainer').click();
            await page.locator('#trailerIdInput').fill(newTrailer.number)
            await page.getByRole('option', { name: `${newTrailer.number}` }).click()
            await page.locator('#typeIdContainer').nth(1).click();
            await page.getByRole('option', { name: 'Лизинг' }).click();
            await page.locator('[name="date"]').nth(1).fill(moment().subtract(6, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(1).fill('20000')
            await page.locator('[name="comment"]').nth(2).fill(`тест во время ${moment().format()}`)
            //водитель
            await page.getByText('Добавить расходы').click();
            await page.locator('#resourceContainer').nth(2).click();
            await page.getByRole('option', { name: 'Водитель' }).click();
            await page.locator('#driverIdContainer').click();
            await page.locator('#driverIdInput').fill(`${bio.lastName} ${bio.firstName} ${bio.patronymic}`)
            await page.getByRole('option', { 'name': `${bio.lastName} ${bio.firstName} ${bio.patronymic}` }).click()
            await page.locator('#typeIdContainer').nth(2).click();
            await page.getByRole('option', { name: 'Обед' }).click();
            await page.locator('[name="date"]').nth(2).fill(moment().subtract(5, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(2).fill('5000')
            await page.locator('[name="comment"]').nth(3).fill(`тест во время ${moment().format()}`)
            await page.locator('[value="Обновить заявку"]').click()
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
        })
        await test.step('создание расходов на все 3 элемента на 2 заявку', async () => {
            await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
            await page.getByText('Редактировать').first().click();
            //грузовик
            await page.getByText('Добавить расходы').click();
            await page.locator('#resourceContainer').nth(0).click();
            await page.getByRole('option', { name: 'Грузовик' }).click();
            await page.locator('#carIdContainer').click();
            await page.locator('#carIdInput').fill(newEntity.newCarNumber)
            await page.getByRole('option', { name: `${newEntity.newCarNumber}` }).click()
            await page.locator('#typeIdContainer').nth(0).click();
            await page.getByRole('option', { name: 'Топливо' }).click();
            await page.locator('[name="date"]').fill(moment().subtract(7, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(0).fill('15000')
            await page.locator('[name="comment"]').nth(1).fill(`тест во время ${moment().format()}`)
            //прицеп
            await page.getByText('Добавить расходы').click();
            await page.locator('#resourceContainer').nth(1).click();
            await page.getByRole('option', { name: 'Прицеп' }).click();
            await page.locator('#trailerIdContainer').click();
            await page.locator('#trailerIdInput').fill(newTrailer.number)
            await page.getByRole('option', { name: `${newTrailer.number}` }).click()
            await page.locator('#typeIdContainer').nth(1).click();
            await page.getByRole('option', { name: 'Топливо' }).click();
            await page.locator('[name="date"]').nth(1).fill(moment().subtract(6, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(1).fill('20000')
            await page.locator('[name="comment"]').nth(2).fill(`тест во время ${moment().format()}`)
            //водитель
            await page.getByText('Добавить расходы').click();
            await page.locator('#resourceContainer').nth(2).click();
            await page.getByRole('option', { name: 'Водитель' }).click();
            await page.locator('#driverIdContainer').click();
            await page.locator('#driverIdInput').fill(`${bio.lastName} ${bio.firstName} ${bio.patronymic}`)
            await page.getByRole('option', { 'name': `${bio.lastName} ${bio.firstName} ${bio.patronymic}` }).click()
            await page.locator('#typeIdContainer').nth(2).click();
            await page.getByRole('option', { name: 'Топливо' }).click();
            await page.locator('[name="date"]').nth(2).fill(moment().subtract(5, 'd').format("DD.MM.YYYY"))
            await page.locator('[name="value"]').nth(2).fill('5000')
            await page.locator('[name="comment"]').nth(3).fill(`тест во время ${moment().format()}`)
            await page.locator('[value="Обновить заявку"]').click()
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
        })
        // await test.step('проверка данных заявок', async () => {
        //     await page.waitForTimeout(30000)//ждём перерасчётов
        //     await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
        //     await expect(page.getByTestId('fact-distance')).toHaveText('287')
        //     await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
        //     await expect(page.getByTestId('fact-distance')).toHaveText('651')
        //     // await expect(page.getByTestId('fact-empty-mileage-distance')).toHaveText('676')
        // })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
