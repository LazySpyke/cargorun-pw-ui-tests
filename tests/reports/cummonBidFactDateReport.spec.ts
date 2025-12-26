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
const apiUse = new api();
const emulatorApi = new SupportAPIRequestsClient();
const debugApi = new DebugAPIRequestsClient();
let bidInfo: any;
const adminId = process.env.compoundAdminId
test.describe('Проверка отчётов с данными одометра', () => {
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
    test('Создание обычной заявки', async ({ page }) => {
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
                planEnterUnloadDate: moment().subtract(3, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "00:10:00")
            await page.waitForTimeout(75000);
        });
        await test.step('создание второй заявки где дата позже', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(3, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Набережные Челны',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: adminId,
                reuseCar: true
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            const orderSort = secondBidInfoResponse.bidPoints.sort((a, b) => a.order - b.order);
            console.log(orderSort)
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, bidInfoResponse.bidPoints[1].geozone.location.coordinates, [orderSort[0].geozone.location.coordinates, orderSort[1].geozone.location.coordinates, orderSort[2].geozone.location.coordinates], null, "00:10:00")
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(54000)
        })
        await test.step('проверка данных заявок', async () => {
            await apiUse.init();
            await page.waitForTimeout(180000)//ждём перерасчётов
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await expect(page.getByTestId('fact-distance')).toHaveText('284') //активный
            await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
            await expect(page.getByTestId('fact-distance')).toHaveText('646') //активный
            await expect(page.getByTestId('fact-empty-mileage-distance')).toHaveText('294') //порожний
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
        await test.step('Проверка 1.Общего отчёта', async () => {
            await page.waitForTimeout(180000)//ждём перерасчётов
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Общий отчет"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(14, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
            await page.waitForTimeout(500)
            await page.locator('[class="book-show__title"]').click(); //чтоб датапикеры скрылись
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="car"]').fill(bidInfo.carOption.number);
            await page.waitForTimeout(5000);
            await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
            console.log(bidInfoResponse);
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            console.log(secondBidInfoResponse);
            await expect(page.locator(`[data-activemileage="${bidInfo.carOption.number}"]`)).toHaveText(
                Math.ceil((bidInfoResponse.activeMileage + secondBidInfoResponse.activeMileage) / 1000).toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-overallmileage="${bidInfo.carOption.number}"]`)).toHaveText(
                Math.ceil((bidInfoResponse.activeMileage + bidInfoResponse.factEmptyMileageFromStartPoint + secondBidInfoResponse.activeMileage + secondBidInfoResponse.factEmptyMileageFromStartPoint) / 1000).toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-overallbidsprice="${bidInfo.carOption.number}"]`)).toHaveText(
                bidInfo.price.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-output="${bidInfo.carOption.number}"]`)).toHaveText('93,02');
            await page.locator(`[data-car="${bidInfo.carOption.number}"]`).nth(1).click();
            await page.locator(`[href="/bids/bid/${bidResponse.id}"]`);
            await expect(page.locator(`[data-counterpartyname="${bidResponse.id}"]`)).toHaveText(
                bidInfoResponse.cargoOwnerDictionaryItem.name
            );
            await expect(page.locator(`[data-externalid="${bidResponse.id}"]`)).toBeEmpty();
            await expect(page.locator(`[data-route="${bidResponse.id}"]`)).toHaveText('Набережные Челны - ');
            await expect(page.locator(`[data-executiondaterange="${bidResponse.id}"]`)).toHaveText(
                `${moment(bidInfoResponse.bidPoints[0].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')} (+03:00) - ${moment(bidInfoResponse.bidPoints[1].planEnterDate, 'YYYY-MM-DDTHH:mm').add(1, 'm').format('DD.MM.YYYY HH:mm')} (+03:00)`
            );
            await expect(page.locator(`[data-activemileage="${bidResponse.id}"]`)).toHaveText(
                Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-emptymileage="${bidResponse.id}"]`)).toHaveText('0,00');
            await expect(page.locator(`[data-overallmileage="${bidResponse.id}"]`)).toHaveText(
                Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-overallbidprice="${bidResponse.id}"]`)).toHaveText(
                bidInfo.price.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-averageplanweight="${bidResponse.id}"]`)).toHaveText('0,00');
            await expect(page.locator(`[data-output="${bidResponse.id}"]`)).toHaveText(
                (bidInfo.price / Math.ceil(bidInfoResponse.planMileage / 1000)).toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            await expect(page.locator(`[data-numberofdays="${bidResponse.id}"]`)).toHaveText('0,40');
            const profitabilityOfBidSettings: any = await clienApi.GetObjectResponse(
                `${process.env.url}/api/organizationProfile/getProfitabilityOfBidSettings`,
                await getAuthData(adminId)
            );
            const planKm = Number(bidInfoResponse.planMileage / 100000).toFixed(2);
            const fuelcost =
                Number(planKm) *
                profitabilityOfBidSettings.averageFuelConsumption *
                profitabilityOfBidSettings.averageFuelCostPerLiter;
            await expect(page.locator(`[data-fuelcost="${bidResponse.id}"]`)).toHaveText(
                fuelcost.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    style: 'decimal', // обычное число, без валюты
                    useGrouping: true, // группировка тысяч
                })
            );
            const finalprofit = bidInfo.price - (fuelcost + profitabilityOfBidSettings.costOfOneDay * 0.4);
            const finalprofitText: string = await page.innerText(`[data-finalprofit="${bidResponse.id}"]`);
            // Удаляем неразрывные пробелы
            const cleanedStr = finalprofitText.replace(/\u00A0/g, '');
            // Меняем запятую на точку
            const normalizedStr = cleanedStr.replace(',', '.');
            // Преобразуем в число
            const numberValue = parseFloat(normalizedStr);
            const epsilon: number = 2;
            if (numberValue - finalprofit < epsilon && numberValue - finalprofit > -epsilon) {
                console.log(`данные корректные${numberValue - finalprofit},${numberValue - finalprofit}`);
            } else {
                throw new TypeError(`не совпадает ожидаемое значение ${numberValue} текст такой, ${finalprofit} расчёт такой`);
            }
        });
        //TODO изменения дат использования одометра
        //         Новый запрос на получение одометров: GET api / dev / Organization / GetOdometerHistoryItems / { organizationId }

        // Новый запрос на изменение дат одометра: POST api / dev / Organization / UpdateOdometerHistoryItem
        //         {
        //     public long Id { get; set; }

        //     public long OrganizationId { get; set; }

        //     public DateTimeOffset StartedAt { get; set; }
        //     public DateTimeOffset ? EndedAt { get; set; }
        // }

        // Новый запрос на удаление записи по одометру: POST api / dev / Organization / DeleteOdometerHistoryItem
        // {
        //         public long Id { get; set; }

        //     public long OrganizationId { get; set; }
        // }
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
    await clienApi.getToken(process.env.compoundCompanyEmail as string, process.env.compoundCompanyPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
