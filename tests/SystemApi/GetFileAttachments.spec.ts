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
const adminId = process.env.logistId
test.describe('Запрос GetFileAttachments', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Запрос GetFileAttachments с удалённым файлом и не удалённым по чату уведомлений', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.logistEmail as string, process.env.logistPassword as string);
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
                unloadAddress: 'Уфа',
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
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('Добавление файлов и удаление', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator('[class="notifys notifys__bell"]').click();
            await page.locator('[class="chat-footer__file"]').click();
            await page.locator('input[type="file"]').setInputFiles('C:/cargorun-pw-ui-tests/LenardMem.png')
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.locator('[title="LenardMem.png"]')).toBeVisible();

            await page.locator('[class="chat-msg__delete-btn"]').click();
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.locator('[title="LenardMem.png"]')).not.toBeVisible();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();

            await page.locator('[class="chat-footer__file"]').click();
            await page.locator('input[type="file"]').setInputFiles('C:/cargorun-pw-ui-tests/Alfir.jpg')
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.locator('[title="Alfir.jpg"]')).toBeVisible();
        })
        await test.step('Проверка запроса GetFileAttachments', async () => {
            const getFileAttachmentsList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Bids/GetFileAttachments/${bidResponse.id}`,
                await getAuthData(adminId))
            console.log(getFileAttachmentsList)
            if (getFileAttachmentsList.length > 1) {
                throw new Error(`количество вернувшихся файлов не корректное`)
            }
            const getFileAttachmentsListAllFiles = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Bids/GetFileAttachments/${bidResponse.id}?WithDeleted=true`,
                await getAuthData(adminId))
            console.log(getFileAttachmentsListAllFiles)
            if (getFileAttachmentsListAllFiles.length <= 1) {
                throw new Error(`количество вернувшихся файлов не корректное`)
            }
        })
    })
    test('Запрос GetFileAttachments с удалённым файлом и не удалённым по чату водителей', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.logistEmail as string, process.env.logistPassword as string);
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
                unloadAddress: 'Уфа',
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
            await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('Добавление файлов и удаление', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//a[@class='show-bid__link d-inline-block position-relative']").click();
            await page.locator('[class="chat-footer__file"]').click();
            await page.locator('input[type="file"]').setInputFiles('C:/cargorun-pw-ui-tests/LenardMem.png')
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.locator('[title="LenardMem.png"]')).toBeVisible();

            await page.locator('[class="chat-msg__actions"]').click();
            await page.getByText('Удалить').click();
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.locator('[title="LenardMem.png"]')).not.toBeVisible();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();

            await page.locator('[class="chat-footer__file"]').click();
            await page.locator('input[type="file"]').setInputFiles('C:/cargorun-pw-ui-tests/Alfir.jpg')
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.locator('[title="Alfir.jpg"]')).toBeVisible();
        })
        await test.step('Проверка запроса GetFileAttachments', async () => {
            const getFileAttachmentsList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Bids/GetFileAttachments/${bidResponse.id}?ChatType=Secondary`,
                await getAuthData(adminId))
            console.log(getFileAttachmentsList)
            if (getFileAttachmentsList.length > 1) {
                throw new Error(`количество вернувшихся файлов не корректное`)
            }
            const getFileAttachmentsListAllFiles = await clienApi.GetObjectResponse(
                `${process.env.url}/api/Bids/GetFileAttachments/${bidResponse.id}?ChatType=Secondary&WithDeleted=true`,
                await getAuthData(adminId))
            console.log(getFileAttachmentsListAllFiles)
            if (getFileAttachmentsListAllFiles.length <= 1) {
                throw new Error(`количество вернувшихся файлов не корректное`)
            }
        })
    })
})

test.beforeAll(async () => {
    await clienApi.getToken(process.env.logistEmail as string, process.env.logistPassword as string);
});

test.afterAll(async () => {
    await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});