//тест зависит от показателя CustomPointVisitIgnoreDuration нужно ставить 90

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const emulatorApi = new SupportAPIRequestsClient();
let bidInfo: any;
const adminId = 1308041
const shiftCoordinate = [52.952065999999995, 55.690988]
test.describe('Учёт кастомных точек', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let shiftCar: any
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Создание заявки с игнорируемой точкой', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(5, 'd').format('YYYY-MM-DDT00:00'),
                planEnterUnloadDate: moment().subtract(1, 'd').format('YYYY-MM-DDT00:00'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Минзелинск',
                unloadAddress: 'Челны',
                userIdForFilter: adminId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
        });
        await test.step('Добавление промежуточной точки', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('//DIV[@class="inline-btn inline-btn--plus"][text()="Произвольная точка"]').click();
            await page.locator('#customPointTypeIdContainer_1').click();
            await page.locator('#typeIdContainer').first().type("Игнорируемая точка", { delay: 100 });
            await page.locator(`text=Игнорируемая точка`).nth(1).click();
            await page.locator('input[name="pointElemGeozone_1"]').click();
            await page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill('Уфа')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator('[class="leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive"]').isVisible();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await page.locator('input[name="planEnterDate_1"]').fill(moment().subtract(3, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[name="planLeaveDate_1"]').fill(moment().subtract(3, 'd').add(1, 'h').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(5000);
        });
        await test.step('Отправка данных посещения точек без посещения игнорируемой точки', async () => {
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(adminId)
            );
            const orderSort = bidInfoResponse.bidPoints.sort((a, b) => a.order - b.order);
            //TODO сделать проверку что дата последняя меньше отправляемого 
            if (orderSort.length == 4) {
                console.log(orderSort.length, 'делаем посещение 3 точек')
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(5, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), lastTrackerCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, orderSort[1].geozone.location.coordinates, orderSort[3].geozone.location.coordinates], null, "00:35:00") //делаем 4 посещения через точки
            }
            else {
                console.log(orderSort.length, `делаем посещение 2 точек`)
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(5, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), lastTrackerCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, orderSort[2].geozone.location.coordinates], null, "00:35:00") //делаем 3 посещения через точки
            }
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(75000);// жду пока пройдёт перерасчёт
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.waitForTimeout(15000);// жду пока пройдёт перерасчёт
            await page.reload();
            await expect(page.locator("//span[@class='badge badge-success']")).toHaveText('Выполнена')
        })
    });
    test('Создание заявки с игнорируемой точкой и перецепкой', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(5, 'd').format('YYYY-MM-DDT00:00'),
                planEnterUnloadDate: moment().subtract(1, 'd').format('YYYY-MM-DDT00:00'),
                carFilter: `(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)`,
                loadAddress: 'Минзелинск',
                unloadAddress: 'Челны',
                userIdForFilter: adminId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
        });
        await test.step('Добавление промежуточной точки', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('//DIV[@class="inline-btn inline-btn--plus"][text()="Произвольная точка"]').click();
            await page.locator('#customPointTypeIdContainer_1').click();
            await page.locator('#typeIdContainer').first().type("Игнорируемая точка", { delay: 100 });
            await page.locator(`text=Игнорируемая точка`).nth(1).click();
            await page.locator('input[name="pointElemGeozone_1"]').click();
            await page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill('Уфа')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator('[class="leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive"]').isVisible();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await page.locator('input[name="planEnterDate_1"]').fill(moment().subtract(3, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[name="planLeaveDate_1"]').fill(moment().subtract(3, 'd').add(1, 'h').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(5000);
        });
        await test.step('Создание перецепки', async () => {
            shiftCar = await clienApi.getCar(`${process.env.url}/api/car/getlist?$filter=(isDeleted eq false and lastFixedAt le ${moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss")}.000Z)&$orderby=id%20desc&$top=100&$skip=0`, await getAuthData(adminId), false)
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.locator('[class="dropdown__btn"]').click();
            await page.locator("//div[contains(text(),'Смена составляющих заявки')]").click();
            await page.locator("//div[@class='btn btn-sm btn-brand']").click();
            await page.waitForTimeout(1500)
            // await page.locator('#react-select-shiftCarIdInstance-placeholder').click();
            console.log(`shiftCar=${JSON.stringify(shiftCar)}`)
            await page.locator('#shiftCarIdInput')
            await page.locator('#shiftCarIdInput').type(shiftCar.number, { delay: 100 });
            await page.locator(`text=${shiftCar.number}`).nth(1).click(); //машина
            await page.locator('[name="pointElemGeozone_undefined"]').click();
            await page.locator("//input[@placeholder='Начните вводить адрес или нажмите на карту']").fill('Россия, Республика Татарстан (Татарстан), Мензелинский район, село Коноваловка')
            await page.waitForTimeout(5000)
            await page.locator("//div[@class='map__result-wrap map__result-wrap--shadow']//div[1]").click();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await page.locator('[name="planEnterDate"]').fill(moment().subtract(2, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator("//input[@value='Сохранить']").click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
        })
        await test.step('Отправка данных посещения точек без посещения игнорируемой точки', async () => {
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(adminId)
            );
            const orderSort = bidInfoResponse.bidPoints.sort((a, b) => a.order - b.order);
            //TODO сделать проверку что дата последняя меньше отправляемого 
            if (orderSort.length == 4) {
                console.log(orderSort.length, 'делаем посещение 3 точек')
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(5, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), lastTrackerCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, orderSort[1].geozone.location.coordinates, shiftCoordinate, orderSort[3].geozone.location.coordinates], null, "00:35:00") //делаем 4 посещения через точки
            }
            else {
                console.log(orderSort.length, `делаем посещение 2 точек`)
                await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(5, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), lastTrackerCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, shiftCoordinate, orderSort[2].geozone.location.coordinates], null, "00:35:00") //делаем 3 посещения через точки
            }
            const lastTrackerShiftCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${shiftCar.id}`,
                await getAuthData(adminId)
            );
            //TODO сделать проверку что дата последняя меньше отправляемого 
            if (orderSort.length == 4) {
                console.log(orderSort.length, 'делаем посещение 3 точек')
                await emulatorApi.coordinatSend(shiftCar.trackerDeviceNumber, moment().subtract(5, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), lastTrackerShiftCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, orderSort[1].geozone.location.coordinates, shiftCoordinate, orderSort[3].geozone.location.coordinates], null, "04:35:00") //делаем 4 посещения через точки
            }
            else {
                console.log(orderSort.length, `делаем посещение 2 точек`)
                await emulatorApi.coordinatSend(shiftCar.trackerDeviceNumber, moment().subtract(5, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), lastTrackerShiftCarInfo[0].location.coordinates, [orderSort[0].geozone.location.coordinates, shiftCoordinate, orderSort[2].geozone.location.coordinates], null, "04:35:00") //делаем 3 посещения через точки
            }
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(75000);// жду пока пройдёт перерасчёт
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await page.waitForTimeout(15000);// жду пока пройдёт перерасчёт
            await page.reload();
            await expect(page.locator("//span[@class='badge badge-success']")).toHaveText('Выполнена')
        })
    });
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});