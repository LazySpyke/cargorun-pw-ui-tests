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
const logist = {
    email: `${faker.word.sample()}-${faker.word.sample()}@cargorun.ru`,
    password: "vjdq4k",
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    patronymic: faker.person.middleName(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    sendLoginData: false
}
const CarColumn = { "isValid": true, "name": `${faker.word.sample()}-${faker.word.sample()}` }

test.describe('Проверка общего отчёта', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    let secondBidInfo: any
    let secondBidResponse: any
    let secondBidInfoResponse: any
    let newEntity: any;
    let newDriver: any;
    let filterLogist: any
    let newKolumn: any;
    let legalPersonList: any
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
            const newLogist = await apiUse.postData(`${process.env.url}/api/organizationEmployees/applyUser`, logist, await getAuthData(adminId))
            console.log(newLogist)
            newKolumn = await apiUse.postData(`${process.env.url}/api/transportColumns/apply`, CarColumn, await getAuthData(adminId))
            console.log(newKolumn)
            filterLogist = await clienApi.GetObjectResponse(
                `${process.env.url}/api/adminpanel/getAllUsers?$filter=(contains(tolower(email),'${logist.email}') and roles/any(roles:roles ne 'Driver'))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId))
            legalPersonList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/legalPersons/getlist?$top=30&$skip=0`,
                await getAuthData(adminId)
            );
        })
        await test.step('создание и привязка новой машины и т д', async () => {
            await debugApi.init();
            newEntity = await debugApi.newCarTracker(await getAuthData(adminId), await getAuthData(36), await emulatorApi.generateCarNumber(), await emulatorApi.generateTrackerNumber('cmd'), moment().subtract(14, 'd').format("YYYY-MM-DDT00:00:00+03:00"), filterLogist[0].id, newKolumn.id)
            console.log(newEntity)
            await page.waitForTimeout(10000)
        })
        await test.step('Создание заявки и запуск в работу', async () => {
            // await debugApi.init();
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 173,
                planEnterLoadDate: moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(6, 'd').format('YYYY-MM-DDTHH:mm'),
                carFilter: `id eq ${await newEntity.newCarId}`,
                loadAddress: 'Челны',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId,
                driverFilter: `id eq ${await newDriver.id}`,
                legalPersonFilter: `id eq ${await legalPersonList[0].id}`
            });
            await bidApi.init();
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
            await emulatorApi.init();
            bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));

            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, moment().subtract(7, 'd').format("YYYY-MM-DDTHH:mm:ss+00:00"), bidInfoResponse.bidPoints[0].geozone.location.coordinates, [bidInfoResponse.bidPoints[0].geozone.location.coordinates, bidInfoResponse.bidPoints[1].geozone.location.coordinates], null, "02:30:00")
            await page.waitForTimeout(50000);
        });
        await test.step('создание второй заявки где дата позже', async () => {
            const bidFixture = new BidCreateInfo(page);
            secondBidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(4, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
                carFilter: `(isDeleted eq false and id eq ${bidInfo.carOption.carId})`,
                loadAddress: 'Набережные Челны',
                unloadAddress: 'Нижний Новгород',
                userIdForFilter: adminId,
                reuseCar: true,
                driverFilter: `id eq ${await newDriver.id}`,
                legalPersonFilter: `id eq ${await legalPersonList[1].id}`
            });
            await bidApi.init();
            secondBidResponse = await bidApi.apply(secondBidInfo, await getAuthData(adminId));
            await bidApi.setStatus(secondBidResponse.id, await getAuthData(adminId));
            secondBidInfoResponse = await bidApi.GetBidInfo(secondBidResponse.id, await getAuthData(adminId));
            await emulatorApi.coordinatSend(bidInfo.carOption.carTracker, `${moment().subtract(3, 'd').format("YYYY-MM-DDTHH:mm:ss")}+00:00`, null, [secondBidInfoResponse.bidPoints[0].geozone.location.coordinates, secondBidInfoResponse.bidPoints[1].geozone.location.coordinates, secondBidInfoResponse.bidPoints[0].geozone.location.coordinates], null, "05:30:00")
            //TODO допилить проверку на данные что активный км считается даже без выезда из нулевой
            await page.waitForTimeout(54000)
        })
        await test.step('проверка данных заявок', async () => {
            await page.waitForTimeout(180000)//ждём перерасчётов
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`)
            await expect(page.getByTestId('fact-distance')).toHaveText('287')
            await page.goto(`${process.env.url}/bids/bid/${secondBidResponse.id}`)
            await expect(page.getByTestId('fact-distance')).toHaveText('651')
            // await expect(page.getByTestId('fact-empty-mileage-distance')).toHaveText('676')
        })
        await test.step('Проверка фильтров в общем отчёте', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Общий отчет"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(7, 'd').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'h').format('DD.MM.YYYY HH:mm'));
            await page.waitForTimeout(500)
            await page.locator('[class="book-show__title"]').click(); //чтоб датапикеры скрылись
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            // await page.locator('input[name="car"]').fill(bidInfo.carOption.number);
            await page.waitForTimeout(5000);
            await page.locator('#multipleCarTypeIdContainer').click();
            // await page.locator('div').filter({ hasText: /^Тип грузовика$/ }).nth(2).click();
            await page.getByRole('option', { name: 'OverallReport' }).click();
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.waitForTimeout(5000)
            // await expect(page.getByRole('cell', { name: `${logist.lastName} ${logist.firstName} ${logist.patronymic}` })).toBeVisible();

            await page.locator('#carLogistIdsContainer').click();
            await page.locator('#carLogistIdsInput').fill(`${logist.lastName} ${logist.firstName} ${logist.patronymic}`);
            await page.getByRole('option', { name: `${logist.lastName} ${logist.firstName} ${logist.patronymic}` }).click();

            await expect(page.getByRole('rowgroup')).toContainText('938,00'); //акивный
            await expect(page.getByRole('rowgroup')).toContainText('0,00 (0,00 %)');//порожка

            await expect(page.getByRole('rowgroup')).toContainText('600,00 (39,01 %)');//порожний без заявки
            await expect(page.getByRole('rowgroup')).toContainText('1 538,00');//общий
            await expect(page.getByRole('rowgroup')).toContainText('0,00');//средний вес
            await expect(page.getByRole('rowgroup')).toContainText('200 000,00'); //ВАЛ
            await expect(page.getByRole('rowgroup')).toContainText('130,04');//выработку руб/км
            // await expect(page.getByRole('rowgroup')).toContainText('1 179,07');
            await page.getByTestId('toggle-with-nds').locator('i').click(); //переключалка БЕЗ НДС
            await expect(page.getByRole('rowgroup')).toContainText('183 333,30');// вал без ндс
            await expect(page.getByRole('rowgroup')).toContainText('119,20');//выработка без ндс
            await page.getByTestId('toggle-with-nds').locator('i').click();// переключение
            await expect(page.getByRole('table')).toContainText('1 (Общее количество машин)');
            await expect(page.getByRole('table')).toContainText('1 (Количество активных машин)');
            await expect(page.getByRole('table')).toContainText('938,00');// футер активный
            await expect(page.getByRole('table')).toContainText('0,00 (0,00 %)'); //футер порожний по заявке
            await expect(page.getByRole('table')).toContainText('600,00 (39,00 %)');// футер порожний без заявки
            await expect(page.getByRole('table')).toContainText('1 538,00');// футер общий
            await expect(page.getByRole('table')).toContainText('0,00');// футер средний вес
            await expect(page.getByRole('table')).toContainText('200 000,00 (Всего)100 000,00 (сумма заявок с НДС)100 000,00 (сумма заявок без НДС)'); //футер ВАЛ
            await expect(page.getByRole('table')).toContainText('130,03 (с учетом НДС)119,19 (без учета НДС)'); //футер выработка
            // await expect(page.getByRole('table')).toContainText('1 179,07');

            // await page.getByRole('cell', { name: `${logist.lastName} ${logist.firstName} ${logist.patronymic}` }).click();
            await page.locator('div').filter({ hasText: /^Колонна$/ }).nth(2).click();
            await page.locator('#transportColumnIdInput').fill(`${CarColumn.name}`);
            await page.getByRole('option', { name: `${CarColumn.name}` }).click();
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.waitForTimeout(10000)
            await expect(page.getByRole('rowgroup')).toContainText('938,00'); //акивный
            await expect(page.getByRole('rowgroup')).toContainText('0,00 (0,00 %)');//порожка
            await expect(page.getByRole('rowgroup')).toContainText('600,00 (39,01 %)');//порожний без заявки
            await expect(page.getByRole('rowgroup')).toContainText('1 538,00');//общий
            await expect(page.getByRole('rowgroup')).toContainText('0,00');//средний вес
            await expect(page.getByRole('rowgroup')).toContainText('200 000,00'); //ВАЛ
            await expect(page.getByRole('rowgroup')).toContainText('130,04');//выработку руб/км
            // await expect(page.getByRole('rowgroup')).toContainText('1 179,07');
            await page.getByTestId('toggle-with-nds').locator('i').click(); //переключалка БЕЗ НДС
            await expect(page.getByRole('rowgroup')).toContainText('183 333,30');// вал без ндс
            await expect(page.getByRole('rowgroup')).toContainText('119,20');//выработка без ндс
            await page.getByTestId('toggle-with-nds').locator('i').click();// переключение
            await expect(page.getByRole('table')).toContainText('1 (Общее количество машин)');
            await expect(page.getByRole('table')).toContainText('1 (Количество активных машин)');
            await expect(page.getByRole('table')).toContainText('938,00');// футер активный
            await expect(page.getByRole('table')).toContainText('0,00 (0,00 %)'); //футер порожний по заявке
            await expect(page.getByRole('table')).toContainText('600,00 (39,00 %)');// футер порожний без заявки
            await expect(page.getByRole('table')).toContainText('1 538,00');// футер общий
            await expect(page.getByRole('table')).toContainText('0,00');// футер средний вес
            await expect(page.getByRole('table')).toContainText('200 000,00 (Всего)100 000,00 (сумма заявок с НДС)100 000,00 (сумма заявок без НДС)'); //футер ВАЛ
            await expect(page.getByRole('table')).toContainText('130,03 (с учетом НДС)119,19 (без учета НДС)'); //футер выработка
            // await expect(page.getByRole('table')).toContainText('1 179,07');
        })
        await test.step('Проверка фильтра по организациям', async () => {
            await page.locator('#legalPersonIdContainer').click();
            // await page.locator('div').filter({ hasText: /^Тип грузовика$/ }).nth(2).click();
            await page.getByRole('option', { name: `${legalPersonList[0].name}` }).click();
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
