import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { faker } from '@faker-js/faker/locale/ru';
import moment from 'moment';
import SupportAPIRequestsClient from '../../api/testSupportRequsets'
const emulatorApi = new SupportAPIRequestsClient();
const newTrailerNumber = emulatorApi.generateTrailerNumber()
const editTrailerNumber = emulatorApi.generateTrailerNumber()

test.describe('Справочник Прицепы', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('CRUD по грузовикам', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание водителя', async () => {
            await page.locator("//SPAN[@class='sidebar__link__text'][text()='Справочники']").click();
            await page.locator(`//A[@class='sidebar__link'][text()='Прицепы']`).first().click();
            await page.locator("//A[@class='btn btn-brand btn-sm'][text()='Создать прицеп']").click();
            await page.locator('input[name="number"]').nth(1).fill(`${(await newTrailerNumber).replace('/', "")}`);
            await page.locator('#brandTypeIdInput').click()
            await page.getByRole('option', {
                name: 'SCANIA'
            }).nth(0).click();
            await page.locator('#typeIdInput').click();
            await page.getByRole('option', {
                name: 'Тент 110'
            }).nth(1).click();
            await page.locator('[type="submit"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
        });
        await test.step('проверка фильтрации прицепа', async () => {
            await page.locator('input[name="number"]').fill(`${await newTrailerNumber}`);
            await page.waitForSelector(`//a[contains(text(),'${await newTrailerNumber}')]`, {
                state: 'visible',
                timeout: 5000,
            });
            await page.waitForSelector(`//div[contains(text(),'Тент 110')]`, {
                state: 'visible',
                timeout: 5000,
            });
        });

        await test.step('редактирование прицепа', async () => {
            await page.getByText(`${await newTrailerNumber}`).click();
            await page.waitForTimeout(1000);
            await page.locator('[name="number"]').fill('')
            await page.waitForTimeout(500)
            await page.locator('[name="number"]').fill('')
            await page.locator('[name="number"]').fill(`${(await editTrailerNumber).replace('/', "")}`);
            await page.locator('#brandTypeIdInput').click()
            await page.getByRole('option', {
                name: 'Другое'
            }).click();
            await page.locator('#typeIdInput').click();
            await page.getByRole('option', {
                name: 'Полуприцеп'
            }).click();
            await page.locator('[class="btn btn-brand btn-sm"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.locator('[class="book-show__close close close--sm"]').click();
        });

        await test.step('проверка фильтрации после редактирования', async () => {
            await page.locator('input[name="number"]').fill(`${await newTrailerNumber}`);
            await expect(
                page.locator(`//a[contains(text(),'${await newTrailerNumber}')]`)
            ).not.toBeVisible();
            await page
                .locator('input[name="number"]')
                .fill(`${await editTrailerNumber}`);
            await page.locator("//div[@class='inline-btn inline-btn--refresh']").click();
            await page.waitForSelector(
                `//a[contains(text(),'${await editTrailerNumber}')]`,
                {
                    state: 'visible',
                    timeout: 5000,
                }
            );
        });

        await test.step('удаление прицепа', async () => {
            await page.getByText(`${await editTrailerNumber}`).click();
            await page.locator('.c-dropd__btn').click();
            await page.locator("//li[contains(text(),'Удалить')]").click();
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await page.locator("//div[@class='notification notification-success notification-enter-done']");
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
        });
        await test.step('проверка данных после удаления', async () => {
            await page
                .locator('input[name="number"]')
                .fill(`${await editTrailerNumber}`);
            await expect(
                page.locator(`//a[contains(text(),'${await editTrailerNumber}')]`)
            ).not.toBeVisible();
            await page.locator("//select[@name='isDeleted']").selectOption('Удаленные');
            await page.waitForSelector(
                `//a[contains(text(),'${await editTrailerNumber}')]`,
                {
                    state: 'visible',
                    timeout: 5000,
                }
            );
        });
    });
});
