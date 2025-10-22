import { test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();

test.describe('Перецепки у водителя', () => {
    let loginPage: LoginPage;
    let bidInfo: any;
    let bidResponse: any;
    let shiftCar: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки с перецепкой', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(2, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().add(1, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Москва',
                userIdForFilter: 36
            });
            await bidApi.init();
            const bidListDriver = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=driverIds/any(driverids:driverids in (${bidInfo.driver.id}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(36)
            );
            bidListDriver.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(36));
            }); //отменяем заявки по водителю
            const bidListCar = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(36)
            );
            bidListCar.forEach(async (element: any) => {
                bidApi.cancelBid(element.id, await getAuthData(36));
            }); //отменяем заявки по машине
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(36));
            await bidApi.setStatus(bidResponse.id, await getAuthData(36));
            await page.waitForTimeout(5000);

            await test.step('добавление точки перецепки', async () => {
                shiftCar = await clienApi.getCar(`${process.env.url}/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=20&$skip=0`, await getAuthData(36), false)
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
                await page.locator("//input[@placeholder='Начните вводить адрес или нажмите на карту']").fill('Казань')
                await page.waitForTimeout(5000)
                await page.locator("//div[@class='map__result-wrap map__result-wrap--shadow']//div[1]").click();
                await page.locator("//div[@class='btn btn-brand map__submit-btn']").click();
                await page.locator('[name="planEnterDate"]').fill(moment().format("DD.MM.YYYY HH:mm"))
                await page.locator("//input[@value='Сохранить']").click();
                await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                    state: 'hidden',
                    timeout: 5000,
                });
            })
            const driverAuth = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(36)
            );
            await clienApi.getToken(driverAuth[0].user.phoneNumber as string, driverAuth[0].password as string);
            const getDriverUserId = await clienApi.GetObjectResponse(
                `${process.env.url}/api/adminpanel/getAllDrivers?$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$top=30&$skip=0`,
                await getAuthData(36)
            )
            await page.waitForTimeout(6000); //вынужденная пауза
            const driverCurrentBidResponse = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/Bids/GetCurrentBid`,
                await getAuthData(getDriverUserId[0].userId)
            )
            //TODo больше сравнений сделать по response, это пока временное быстрое решение
            if (driverCurrentBidResponse.itemChangePoints[0].shiftCarId != shiftCar.id) {
                throw new Error('значения по машине перецепке некорректная');
            }
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
