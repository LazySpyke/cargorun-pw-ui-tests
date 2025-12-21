import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo, gerateBidCreateInfo } from '../../pages/Fixtures';
import { diff } from 'deep-diff';
import moment from 'moment';
import DebugAPIRequestsClient from '../../api/debugRequests'
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import DistributinAPIBid from '../../api/distiburionBidApi';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
import { BidPage } from '../../pages/BidsPage';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const distribApi = new DistributinAPIBid();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
let bidInfo: any;
const adminId = process.env.compoundAdminId
const rootId = process.env.rootId
test.describe('Проверка запроса GetListForExternal', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let distributionResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    let newEntity: any;
    let distributionBidId: any;
    let BidId: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });
    test('Проверка полей обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
        });
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
                isVatTop: false
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "00:10:00")
            await page.waitForTimeout(50000);
        });
        await test.step('создание второй заявки где дата позже', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(4, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Набережные Челны',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: adminId,
                reuseCar: true,
                isVatTop: false
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, null, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "00:10:00")
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(54000)
        })
        await test.step('getListForExternal', async () => {
            // bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            await page.waitForTimeout(15000)
            const expectedJson = {
                id: secondBidInfoResponse.id,
                priceWithoutVatOnTop: secondBidInfoResponse.priceWithoutVatOnTop,
                distributionBidId: secondBidInfoResponse.distributionBidId,
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
                extendedProperties: [],
                message: null
            }
            const getlistForExternal = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/GetListForExternal?$orderby=updatedAt%20desc&$top=10&$skip=0&$filter=id eq ${secondBidInfoResponse.id}`,
                await getAuthData(adminId)
            );
            // getlistForExternal[0].createdAt = moment(natcarBidList[0].createdAt).format()
            // natcarBidList[0].updatedAt = moment(natcarBidList[0].updatedAt).format()

            console.log(getlistForExternal)
            // delete natcarBidList[0].loadUnloadPoints
            // const differences = diff(natcarBidList[0], expectedJson);

            if (getlistForExternal[0].priceWithoutVatOnTop != expectedJson.priceWithoutVatOnTop) {
                throw new Error(`'Различия:`)
            } else {
                console.log('Объекты совпадают');
            }
        })
    })
    test('Проверка полей заявки созданной из заказа', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заказа без даты выполнения', async () => {
            const bidFixture = new BidCreateInfo(page);
            const bidPage = new BidPage(page);
            const bidInfo: gerateBidCreateInfo = await bidFixture.CommonBid();
            await bidPage.gotoDistribution();
            await bidPage.CreateCommonDistributionBid(bidInfo);
        });
        await test.step('редактирование полей', async () => {
            await page.locator("//div[@class='inline-btn inline-btn--edit']").click();
            await page.locator('[name="comment"]').nth(0).fill('Автотест заказ на заявку GetListForExternal');
            await page.locator('[name="clientBidNumber"]').fill(`clientBidNumber`)
            await page.locator('[name="clientBidDate"]').fill(moment().format(`${moment().format('DD.MM.YYYY')}`));
            await page.locator('[name="externalCity_0"]').fill('Челны_externalCity_0');
            await page.locator('[name="externalCity_1"]').fill('Уфа_externalCity_1');
            await page.locator("//input[@value='Обновить заказ']").click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            distributionBidId = await page.innerText(`[class="show-bid__head-title"]`);
        })
        await test.step('Проверка отредактированных полей', async () => {
            await expect(page.getByTestId('comment')).toHaveText('Автотест заказ на заявку GetListForExternal');
            await expect(page.getByTestId('clientBidNumber')).toHaveText('clientBidNumber');
            await expect(page.getByTestId('clientBidDate')).toHaveText(moment().format('DD.MM.YYYY'));
            await expect(page.getByTestId('point-external-city').nth(0)).toHaveText(/Челны_externalCity_0/);
            await expect(page.getByTestId('point-external-city').nth(1)).toHaveText(/Уфа_externalCity_1/);
        })
        await test.step('getListForExternal', async () => {
            await distribApi.init();
            console.log(await distributionBidId.replace(/[^0-9]/g, ""))
            distributionResponse = await distribApi.GetBidInfo(await distributionBidId.replace(/[^0-9]/g, ""), await getAuthData(rootId));
            await page.waitForTimeout(15000)
            const expectedJson = {
                id: distributionResponse.id,
                priceWithoutVatOnTop: distributionResponse.priceWithoutVatOnTop,
                distributionBidId: distributionResponse.distributionBidId,
                distributionBidExternalId: null,
                clientBidDate: distributionResponse.clientBidDate,
                clientBidNumber: distributionResponse.clientBidNumber,
                comment: distributionResponse.comment,
                createdById: rootId,
                startedById: rootId,
                isPreBid: false,
                isEmptyMileageBid: false,
                createdAt: moment(distributionResponse.createdAt).format(),
                updatedAt: moment(distributionResponse.updatedAt).format(),
                status: distributionResponse.status,
                // loadUnloadPoints: [[Object], [Object]],
                supportPoints: [],
                extendedProperties: [],
                message: null
            }
            const getlistForExternal = await clienApi.GetObjectResponse(
                `${process.env.url}/api/distributionBids/GetListForExternal?$orderby=updatedAt%20desc&$top=10&$skip=0&$filter=id eq ${distributionResponse.id}`,
                await getAuthData(rootId)
            );
            // getlistForExternal[0].createdAt = moment(natcarBidList[0].createdAt).format()
            // natcarBidList[0].updatedAt = moment(natcarBidList[0].updatedAt).format()

            console.log(getlistForExternal)
            // delete natcarBidList[0].loadUnloadPoints
            // const differences = diff(natcarBidList[0], expectedJson);

            if (getlistForExternal[0].priceWithoutVatOnTop != expectedJson.priceWithoutVatOnTop) {
                throw new Error(`'Различия:`)
            } else {
                console.log('Объекты совпадают');
            }
        })
        await test.step('Создание заявки из заказа и проверка полей', async () => {
            await page.locator("//div[@class='inline-btn inline-btn--checkmark']").click();
            await page.locator('#driverInput').click();
            await page.getByRole('option', { name: 'Александр Иванович' }).click();
            await page.waitForTimeout(500)
            await page.locator("//input[@value='Сохранить как черновик']").click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.locator('[class="book-form__close close close--sm"]').click();
            await page.waitForTimeout(2000)
            BidId = await page.innerText(`[class="show-bid__head-title"]`);
        })
        await test.step('Проверка отредактированных полей', async () => {
            await expect(page.getByTestId('comment')).toHaveText('Автотест заказ на заявку GetListForExternal');
            await expect(page.getByTestId('clientBidNumber')).toHaveText('clientBidNumber');
            await expect(page.getByTestId('clientBidDate')).toHaveText(moment().format('DD.MM.YYYY'));
            await expect(page.getByTestId('[data-point-external-city="0"]').nth(0)).toHaveText(/Челны_externalCity_0/);
            await expect(page.getByTestId('[data-point-external-city="1"]').nth(1)).toHaveText(/Уфа_externalCity_1/);
        })
        await test.step('getListForExternal', async () => {
            await bidApi.init();
            console.log(await BidId.replace(/[^0-9]/g, ""))
            bidResponse = await bidApi.GetBidInfo(await BidId.replace(/[^0-9]/g, ""), await getAuthData(rootId));
            await page.waitForTimeout(15000)
            const expectedJson = {
                id: bidResponse.id,
                priceWithoutVatOnTop: bidResponse.priceWithoutVatOnTop,
                distributionBidId: bidResponse.distributionBidId,
                distributionBidExternalId: null,
                clientBidDate: distributionResponse.clientBidDate,
                clientBidNumber: distributionResponse.clientBidNumber,
                comment: distributionResponse.comment,
                createdById: rootId,
                startedById: rootId,
                isPreBid: false,
                isEmptyMileageBid: false,
                createdAt: moment(distributionResponse.createdAt).format(),
                updatedAt: moment(distributionResponse.updatedAt).format(),
                status: distributionResponse.status,
                // loadUnloadPoints: [[Object], [Object]],
                supportPoints: [],
                extendedProperties: [],
                message: null
            }
            const getlistForExternal = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/GetListForExternal?$orderby=updatedAt%20desc&$top=10&$skip=0&$filter=id eq ${bidResponse.id}`,
                await getAuthData(rootId)
            );
            // getlistForExternal[0].createdAt = moment(natcarBidList[0].createdAt).format()
            // natcarBidList[0].updatedAt = moment(natcarBidList[0].updatedAt).format()

            console.log(getlistForExternal)
            // delete natcarBidList[0].loadUnloadPoints
            // const differences = diff(natcarBidList[0], expectedJson);

            if (getlistForExternal[0].priceWithoutVatOnTop != expectedJson.priceWithoutVatOnTop) {
                throw new Error(`'Различия:`)
            } else {
                console.log('Объекты совпадают');
            }
        })
    })
});

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
    await clienApi.getToken(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
});
test.afterAll(async () => {
    if (bidInfo != undefined) {
        await clienApi.deleteUsedCar(bidInfo.carOption.carId)
    }
});
