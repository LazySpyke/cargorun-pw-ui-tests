import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { faker } from '@faker-js/faker/locale/ru';
import moment from 'moment';

const groupName = `Не скрыто от планирования в ${moment().format()}${faker.word.words()}`
const editGroupName = `Не скрыто от планирования в ${moment().format()}${faker.word.words()}`

test.describe('Справочник Группы Пользователей', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('CRUD по группе пользователей', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание обычной группы пользователей', async () => {
            await page.locator("//SPAN[@class='sidebar__link__text'][text()='Справочники']").click();
            await page.locator(`//a[@title='Группы пользователей']`).first().click();
            await page.waitForTimeout(1500);
            await page.locator("//a[@class='btn btn-brand btn-sm']").click();

            await page.locator('[name="name"]').nth(1).fill(groupName)
            await page.locator('[class="btn btn-sm btn-brand"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='notification notification-success notification-enter-done']");
        });

        await test.step('проверка фильтрации', async () => {
            await page.locator('input[name="name"]').fill(groupName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${groupName}']`)).toBeVisible();
            await expect(page.locator('[class="text-center"]').nth(1)).toHaveText('Нет')//скрыт от планирования или нет
        });

        await test.step('редактирование группы', async () => {
            await page.getByText(groupName).click();
            await page.locator('[class="c-dropd__btn"]').click();
            await page.locator("//li[contains(text(),'Изменить')]").click();
            await page.locator('[name="name"]').nth(0).fill(editGroupName)
            await page.locator('[class="btn btn-sm btn-brand"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='notification notification-success notification-enter-done']");
            await page.locator('[class="book-show__close close close--sm"]').click();
        })
        await test.step('проверка фильтрации после редактирования', async () => {
            await page.locator('input[name="name"]').fill(editGroupName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${editGroupName}']`)).toBeVisible();
            await expect(page.locator('[class="text-center"]').nth(1)).toHaveText('Нет')//скрыт от планирования или нет
        });

        await test.step('Удаление группы пользователей', async () => {
            await page.getByText(editGroupName).click();
            await page.locator('[class="c-dropd__btn"]').click();
            await page.locator("//li[contains(text(),'Удалить')]").click();
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
        })
        await test.step('проверка фильтрации после удаления', async () => {
            await page.locator('input[name="name"]').fill(editGroupName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${editGroupName}']`)).not.toBeVisible();
        });
    });



    test('CRUD по группе скрытых от планирования пользователей', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание обычной группы пользователей', async () => {
            await page.locator("//SPAN[@class='sidebar__link__text'][text()='Справочники']").click();
            await page.locator(`//a[@title='Группы пользователей']`).first().click();
            await page.waitForTimeout(1500);
            await page.locator("//a[@class='btn btn-brand btn-sm']").click();

            await page.locator('[name="name"]').nth(1).fill(groupName)
            await page.locator('[name="hiddenInPlanning"]').nth(1).click()
            await page.locator('[class="btn btn-sm btn-brand"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='notification notification-success notification-enter-done']");
        });

        await test.step('проверка фильтрации', async () => {
            await page.locator('input[name="name"]').fill(groupName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${groupName}']`)).toBeVisible();
            await expect(page.locator('[class="text-center"]').nth(1)).toHaveText('Да')//скрыт от планирования или нет
        });

        await test.step('редактирование группы', async () => {
            await page.getByText(groupName).click();
            await page.locator('[class="c-dropd__btn"]').click();
            await page.locator("//li[contains(text(),'Изменить')]").click();
            await page.locator('[name="name"]').nth(0).fill(editGroupName)
            await page.locator('[class="btn btn-sm btn-brand"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='notification notification-success notification-enter-done']");
            await page.locator('[class="book-show__close close close--sm"]').click();
        })
        await test.step('проверка фильтрации после редактирования', async () => {
            await page.locator('input[name="name"]').fill(editGroupName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${editGroupName}']`)).toBeVisible();
            await expect(page.locator('[class="text-center"]').nth(1)).toHaveText('Да')//скрыт от планирования или нет
        });
    });
});