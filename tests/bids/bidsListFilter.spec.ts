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
const adminId = process.env.emptyCompanyAddminId
interface Visit {
    id: number;
    isMobile: boolean;
    bidPointId: number;
    enterDate: string;
    leaveDate: string;
}
test.describe('Учёт точек при кругорейсах, даты приближенные к плану', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let bidInfoResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Создание обычной заявки', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: process.env.paymentTypeId,
                ndsTypeId: process.env.ndsTypeId,
                planEnterLoadDate: moment().subtract(1, 'd').format('YYYY-MM-DDT00:00'),
                planEnterUnloadDate: moment().add(4, 'd').format('YYYY-MM-DDT00:00'),
                loadAddress: 'Казань',
                unloadAddress: 'Уфа',
                userIdForFilter: adminId
            });
        });
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
});
test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});