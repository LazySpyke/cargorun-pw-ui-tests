const startValue: number = 1000;
const startDate: string = moment().subtract(30, 'd').format("YYYY-MM-DDTHH:mm:ssZ")
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import { diff } from 'deep-diff';
import moment from 'moment';
import DebugAPIRequestsClient from '../../api/debugRequests'
import APIRequestsClient from '../../api/clienApiRequsets';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
import api from '../../api/apiRequests';
import APIBid from '../../api/bidApi';
const clienApi = new APIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
const emulatorApi = new SupportAPIRequestsClient();
const bidApi = new APIBid();
const apiUse = new api();
let bidInfo: any;
const adminId = process.env.rootId
const emptyAdminId = process.env.emptyCompanyAddminId
const externalId = `тест время ${moment().format()}`
test.describe('Проверка работы метода natcar/bids/getlist', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    let newEntity: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Заявка завершенная вручную', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(6, 'h').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Москва',
                userIdForFilter: adminId,
                cargosWeight: 10,
                externalId: externalId,
                responsibleId: process.env.logistId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(adminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('завершение заявки', async () => {
            await page.waitForTimeout(60000);
            await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('проверка работы natcar/bids/getlist', async () => {
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(15000)
            const expectedJson = {
                id: bidInfoResponse.id,
                distributionBidId: bidInfoResponse.distributionBidId,
                distributionBidExternalId: null,
                createdById: adminId,
                startedById: adminId,
                responsibleId: bidInfo.responsibleId,
                startedBy: { id: adminId, shortName: 'Last2 F. P.' },
                isPreBid: false,
                isEmptyMileageBid: false,
                createdAt: moment(bidInfoResponse.createdAt).format(),
                updatedAt: moment(bidInfoResponse.updatedAt).format(),
                status: bidInfoResponse.status,
                // loadUnloadPoints: [[Object], [Object]],
                supportPoints: [],
                resources: [
                    {
                        indexFrom: "0",
                        indexTo: "1",
                        driverId: bidInfoResponse.driver.id,
                        vehicleId: bidInfoResponse.car.carId,
                        trailerId: bidInfoResponse.trailer.id
                    }
                ],
                extendedProperties: [],
                message: null
            }
            const natcarBidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/natcar/bids/getlist?$orderby=updatedAt%20desc&$top=10&$skip=0&$filter=id eq ${bidResponse.id}`,
                await getAuthData(adminId)
            );
            natcarBidList[0].createdAt = moment(natcarBidList[0].createdAt).format()
            natcarBidList[0].updatedAt = moment(natcarBidList[0].updatedAt).format()

            delete natcarBidList[0].loadUnloadPoints
            const differences = diff(natcarBidList[0], expectedJson);

            if (differences) {
                throw new Error(`'Различия:', ${JSON.stringify(differences)}`)
            } else {
                console.log('Объекты совпадают');
            }
        })
    })
    test('Создание заявка с нулевой точкой и маршрутными точками', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(emptyAdminId), await getAuthData(process.env.rootId), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('ote'), moment().subtract(31, 'd').format("YYYY-MM-DDT00:00:00+03:00"))
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
                planEnterLoadDate: moment().subtract(30, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(16, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Архангельск',
                unloadAddress: 'Хабаровск',
                userIdForFilter: emptyAdminId
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(emptyAdminId)
            );
            bidList.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(emptyAdminId));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(emptyAdminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(emptyAdminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(emptyAdminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(30, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "08:10:00", 30)
            await page.waitForTimeout(50000);
            await debugApi.applyOdometerValues(await getAuthData(process.env.rootId), newEntity.newTrackerId, startValue, startDate, 500)
        });
        await test.step('создание второй заявки где дата позже', async () => {
            await page.waitForTimeout(60000);
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(15, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Улан-удэ',
                unloadAddress: 'Самара',
                userIdForFilter: emptyAdminId,
                reuseCar: true
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(emptyAdminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(emptyAdminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(emptyAdminId));
            const lastTrackerCarInfo = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Map/GetLastCarsLocations?$filter=car/id%20eq%20${bidInfo.carOption.carId}`,
                await getAuthData(emptyAdminId)
            );
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, lastTrackerCarInfo[0].fixedAt, lastTrackerCarInfo[0].location.coordinates, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "16:00:00", 30)
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await debugApi.applyOdometerValues(await getAuthData(process.env.rootId), newEntity.newTrackerId, startValue + 15000, moment().subtract(3, 'h').format("YYYY-MM-DDTHH:mm:ssZ"), 500)
            await page.waitForTimeout(54000)
            await apiUse.init();
            const recalculateCar = await apiUse.postData(`${process.env.url}/api/adminpanel/recalculateCoordinates`, {
                "carIds": [
                    bidInfo.carOption.carId
                ],
                "from": moment().subtract(30, 'd').format("YYYY-MM-DD"),
                "to": moment().format("YYYY-MM-DD"),
                "intCalculateFlags": 7
            }, await getAuthData(process.env.rootId))
            console.log(recalculateCar)
        })
        await test.step('редактирование маршрута заявки', async () => {
            await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
            await page.locator("//div[@class='inline-btn inline-btn--edit'][contains(text(),'Маршрут')]").click();
            await page.locator("//div[@title='Разделить участок']").first().click()
            await page.locator('[class="map__picker-field map__picker-field--desktop"]').fill('Нижний Новгород')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await expect(page.locator('[class="map-panel__route-icon map-panel__route-icon--between"]')).toBeVisible();
            await expect(page.locator('[title="Удалить точку(маршрут будет перестроен)"]')).toBeVisible();
            await page.locator("//div[@title='Разделить участок']").nth(2).click()
            await page.locator('[class="map__picker-field map__picker-field--desktop"]').fill('елабуга')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await expect(page.locator('[class="map-panel__route-icon map-panel__route-icon--between"]').nth(1)).toBeVisible();
            await expect(page.locator('[title="Удалить точку(маршрут будет перестроен)"]').nth(1)).toBeVisible();
            await page.locator('[class="btn-brand btn btn-sm"]').click();
            await page.waitForTimeout(15000)
        })
        await test.step('Добавление кастомной точки', async () => {
            await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('//DIV[@class="inline-btn inline-btn--plus"][text()="Произвольная точка"]').click();
            await page.locator('#customPointTypeIdContainer_1').click();
            await page.locator('#typeIdContainer').first().type("Таможня", { delay: 100 });
            await page.locator(`text=Таможня`).nth(1).click();
            await page.locator('input[name="pointElemGeozone_1"]').click();
            await page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill('Казань')
            await page.locator('[class="map__result-item"]').first().click();
            await page.locator('[class="leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive"]').isVisible();
            await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
            await page.locator('input[name="planEnterDate_1"]').fill(moment().subtract(3, 'd').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[name="planLeaveDate_1"]').fill(moment().subtract(3, 'd').add(1, 'h').format("DD.MM.YYYY HH:mm"))
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
            await page.waitForTimeout(5000);
        })
        await test.step('проверка работы natcar/bids/getlist', async () => {
            await page.waitForTimeout(15000)
            bidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(emptyAdminId));
            const expectedJson = {
                id: bidInfoResponse.id,
                distributionBidId: bidInfoResponse.distributionBidId,
                distributionBidExternalId: null,
                createdById: emptyAdminId,
                startedById: emptyAdminId,
                responsibleId: emptyAdminId,
                startedBy: { id: emptyAdminId, shortName: 'Empty M. T.' },
                isPreBid: false,
                isEmptyMileageBid: false,
                createdAt: moment(bidInfoResponse.createdAt).format(),
                updatedAt: moment(bidInfoResponse.updatedAt).format(),
                status: bidInfoResponse.status,
                // loadUnloadPoints: [[Object], [Object]],
                // supportPoints: [],
                resources: [
                    {
                        indexFrom: "-1",
                        indexTo: "0",
                        driverId: bidInfoResponse.driver.id,
                        vehicleId: bidInfoResponse.car.carId,
                        trailerId: bidInfoResponse.trailer.id
                    },
                    {
                        indexFrom: "0",
                        indexTo: "0.1",
                        driverId: bidInfoResponse.driver.id,
                        vehicleId: bidInfoResponse.car.carId,
                        trailerId: bidInfoResponse.trailer.id
                    },
                    {
                        indexFrom: "0.1",
                        indexTo: "1",
                        driverId: bidInfoResponse.driver.id,
                        vehicleId: bidInfoResponse.car.carId,
                        trailerId: bidInfoResponse.trailer.id
                    }
                ],
                extendedProperties: [],
                message: null
            }
            const natcarBidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/natcar/bids/getlist?$orderby=updatedAt%20desc&$top=10&$skip=0&$filter=id eq ${secondBidResponse.id}`,
                await getAuthData(emptyAdminId)
            );
            natcarBidList[0].createdAt = moment(natcarBidList[0].createdAt).format()
            natcarBidList[0].updatedAt = moment(natcarBidList[0].updatedAt).format()
            delete natcarBidList[0].loadUnloadPoints
            delete natcarBidList[0].supportPoints
            //TODO реализовать проверку на эти 2 удаляемых поля
            const differences = diff(natcarBidList[0], expectedJson);

            if (differences) {
                throw new Error(`'Различия:', ${JSON.stringify(differences)}`)
            } else {
                console.log('Объекты совпадают');
            }
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
