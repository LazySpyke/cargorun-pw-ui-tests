import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
import api from '../../api/apiRequests';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
const apiUse = new api();
let bidInfo: any;
const adminId = 36
const emptyCompanyAdmin = 1305211
const envelopeCode = Math.floor(Math.random() * 99999999);
const postamatCode = '1122334455131'
import fs from 'fs'
test.describe('Отчёты по работе водителей с заданиями', () => {
    let loginPage: LoginPage;
    let bidResponse: any;
    let documentAssignmentResponse: any;
    let taskId: any
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Проверка сдачи документов с согласованием от 1С', async ({ page, request }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(4, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(3, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Москва',
                userIdForFilter: adminId
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
        await test.step('Проставляем флаг о создании задачи', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('span[name="createDocumentAssignment"]').click();
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
        })
        await test.step('завершение заявки', async () => {
            await page.waitForTimeout(120000);
            await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(adminId));
        });
        await test.step('Авторизация водителем', async () => {
            const driverAuth = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            await clienApi.getToken(driverAuth[0].user.phoneNumber as string, driverAuth[0].password as string);
            const getDriverUserId = await clienApi.GetObjectResponse(
                `${process.env.url}/api/adminpanel/getAllDrivers?$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$top=30&$skip=0`,
                await getAuthData(adminId)
            )
            await page.waitForTimeout(6000); //вынужденная пауза
            const documentAssignmentResponse = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/documentassignment/getlist`,
                await getAuthData(getDriverUserId[0].userId)
            )
            console.log(documentAssignmentResponse)
            taskId = documentAssignmentResponse[0].id
            const fileUpdate = await request.fetch(`${process.env.url}/api/driver/DocumentAssignment/UploadFile`, {
                method: 'POST',
                headers: {
                    'Authorization': `${await getAuthData(getDriverUserId[0].userId)}`,
                },
                multipart: {
                    DocumentAssignmentId: taskId,
                    File: fs.createReadStream('C:/cargorun-pw-ui-tests/LenardMem.png')
                },
            });
            console.log(fileUpdate.status())
            await apiUse.init();
            await page.waitForTimeout(1000);
            const documentAssignmentSetStatus = await apiUse.postData(`${process.env.url}/api/driver/documentassignment/setstatus`, {
                "status": "DocumentsUploaded",
                "id": taskId
            }, await getAuthData(getDriverUserId[0].userId))
            console.log(documentAssignmentSetStatus)
            const getUploadFiles = await apiUse.postData(`${process.env.url}/api/DocumentAssignment/GetFiles`, {
                "documentAssignmentIds": [
                    taskId
                ]
            }, await getAuthData(adminId))
            await page.waitForTimeout(10000)
            console.log(getUploadFiles[0])
            const setFileStatus = await apiUse.postData(`${process.env.url}/api/DocumentAssignment/SetFileStatuses`, {
                "documentAssignmentFiles": [
                    {
                        "status": "Approved",
                        "id": await getUploadFiles[0].id
                    }
                ],
                "id": taskId
            }, await getAuthData(adminId))
            const documentAssignmentApply = await apiUse.postData(`${process.env.url}/api/driver/DocumentAssignment/Apply`, {
                "envelopeCode": '41253291',
                "id": taskId
            }, await getAuthData(getDriverUserId[0].userId))
            console.log(documentAssignmentApply)
        })
        await test.step('Проверка данных в отчёте по задачам водителей', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по работе водителей с заданиями"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(7, 'h').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'h').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="documentAssignmentId"]').fill(`${taskId}`);
            await page.waitForTimeout(1500);
            await page.locator(`[data-bidid="${bidResponse.id}"]`).isVisible();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(1500);
            await page.locator(`[data-bidid="${bidResponse.id}"]`).isVisible();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(1500);
            await page.locator(`[data-bidid="${bidResponse.id}"]`).isVisible();

            //TODO доделать проверки и дополнить на статусы и добавить проверку в компании с согласованием 1С работает или нет
        })
    })
    test('Проверка сдачи документов без согласования от 1С', async ({ page, request }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.emptyCompanyEmail as string, process.env.emptyCompanyPassword as string);
        });
        await test.step('Создание заявки и запуск в работу', async () => {
            const bidFixture = new BidCreateInfo(page);
            bidInfo = await bidFixture.ApiCommonBid({
                price: 100000,
                paymentTypeId: 176,
                ndsTypeId: 175,
                planEnterLoadDate: moment().subtract(4, 'd').format('YYYY-MM-DDTHH:mm'),
                planEnterUnloadDate: moment().subtract(3, 'd').format('YYYY-MM-DDTHH:mm'),
                loadAddress: 'Челны',
                unloadAddress: 'Москва',
                userIdForFilter: emptyCompanyAdmin
            });
            await bidApi.init();
            const bidList = await clienApi.GetObjectResponse(
                `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(emptyCompanyAdmin)
            );
            bidList.forEach(async (element) => {
                bidApi.cancelBid(element.id, await getAuthData(emptyCompanyAdmin));
            });
            bidResponse = await bidApi.apply(bidInfo, await getAuthData(emptyCompanyAdmin));
            await bidApi.setStatus(bidResponse.id, await getAuthData(emptyCompanyAdmin));
        });
        await test.step('Проставляем флаг о создании задачи', async () => {
            await page.goto(`${process.env.url}/bids/bid/${bidResponse.id}`);
            await page.locator("//div[@class='inline-btn inline-btn--edit']").first().click();
            await page.locator('span[name="createDocumentAssignment"]').click();
            await page.locator('input[value="Обновить заявку"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
        })
        await test.step('завершение заявки', async () => {
            await page.waitForTimeout(120000);
            await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(emptyCompanyAdmin));
        });
        await test.step('Авторизация водителем', async () => {
            const driverAuth = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$orderby=id desc&$top=30&$skip=0`,
                await getAuthData(adminId)
            );
            await clienApi.getToken(driverAuth[0].user.phoneNumber as string, driverAuth[0].password as string);
            const getDriverUserId = await clienApi.GetObjectResponse(
                `${process.env.url}/api/adminpanel/getAllDrivers?$filter=(isDeleted eq false and contains(cast(id, Model.String),'${bidInfo.driver.id}'))&$top=30&$skip=0`,
                await getAuthData(adminId)
            )
            await page.waitForTimeout(6000); //вынужденная пауза
            const documentAssignmentResponse = await clienApi.GetObjectResponse(
                `${process.env.url}/api/driver/documentassignment/getlist`,
                await getAuthData(getDriverUserId[0].userId)
            )
            console.log(documentAssignmentResponse)
            const fileUpdate = await request.fetch(`${process.env.url}/api/driver/DocumentAssignment/UploadFile`, {
                method: 'POST',
                headers: {
                    'Authorization': `${await getAuthData(getDriverUserId[0].userId)}`,
                },
                multipart: {
                    DocumentAssignmentId: documentAssignmentResponse[0].id,
                    File: fs.createReadStream('C:/cargorun-pw-ui-tests/LenardMem.png')
                },
            });
            console.log(fileUpdate.status())
            await apiUse.init();
            await page.waitForTimeout(1000);
            const documentAssignmentSetStatus = await apiUse.postData(`${process.env.url}/api/driver/documentassignment/setstatus`, {
                "status": "DocumentsUploaded",
                "id": documentAssignmentResponse[0].id
            }, await getAuthData(getDriverUserId[0].userId))
            console.log(documentAssignmentSetStatus)
            const documentAssignmentApply = await apiUse.postData(`${process.env.url}/api/driver/DocumentAssignment/Apply`, {
                "envelopeCode": envelopeCode,
                "id": documentAssignmentResponse[0].id
            }, await getAuthData(getDriverUserId[0].userId))
            console.log(documentAssignmentApply)
        })
        await test.step('Проверка данных в отчёте по задачам водителей', async () => {
            await page.locator('[title="Отчеты"]').click();
            await page.locator('[name="Отчет по работе водителей с заданиями"]').click();
            await page.locator('input[name="startDate"]').fill(moment().subtract(7, 'h').format('DD.MM.YYYY HH:mm'));
            await page.locator('input[name="endDate"]').fill(moment().add(1, 'h').format('DD.MM.YYYY HH:mm'));
            await page
                .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
                .click();
            await page.locator('input[name="documentAssignmentId"]').fill(`${documentAssignmentResponse[0].id}`);
            await page.waitForTimeout(1500);
            await page.locator(`[data-bidid="${bidResponse.id}"]`).isVisible();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(1500);
            await page.locator(`[data-bidid="${bidResponse.id}"]`).isVisible();
            await page.locator('input[name="bidId"]').fill(`${bidResponse.id}`);
            await page.waitForTimeout(1500);
            await page.locator(`[data-bidid="${bidResponse.id}"]`).isVisible();

            //TODO доделать проверки и дополнить на статусы и добавить проверку в компании с согласованием 1С работает или нет
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


// function FilterDocs(taskId) {
//     return unirest('POST', `${process.env.url}api/DocumentAssignment/GetFiles`)
//         .headers({
//             'Authorization': `Bearer ${tokenBr}`,
//             'Content-Type': 'application/json'
//         })
//         .send(JSON.stringify({
//             "documentAssignmentIds": [
//                 taskId
//             ]
//         }))
//         .then(function (res) {
//             filesInfo = JSON.parse(res.raw_body)
//             console.log(filesInfo)
//             console.log(res.raw_body, res.status)
//             SetDocumentStatus("Approved", filesInfo[0].id, filesInfo[0].documentAssignmentId)
//         })
// }
// function SetDocumentStatus(status, fileId, taskId) {
//     console.log(status, fileId, taskId)
//     return unirest('POST', `${process.env.url}api/DocumentAssignment/SetFileStatuses`)
//         .headers({
//             'Authorization': `Bearer ${tokenBr}`,
//             'Content-Type': 'application/json'
//         })
//         .send(JSON.stringify({
//             "documentAssignmentFiles": [
//                 {
//                     "status": status,
//                     "id": fileId
//                 }
//             ],
//             "id": taskId
//         }))
//         .then(function (res) {
//             console.log(res.raw_body, res.status)
//         })
// }