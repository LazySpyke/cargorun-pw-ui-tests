import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { faker } from '@faker-js/faker/locale/ru';
import moment from 'moment';

const KolumnName = `Н${moment().format()}${faker.word.words()}`
const editKolumnName = `${moment().format()}${faker.word.words()}`

test.describe('Справочник Колонны', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('CRUD по колоннам', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание колонны', async () => {
            await page.locator("//SPAN[@class='sidebar__link__text'][text()='Справочники']").click();
            await page.locator(`//a[@title='Колонны']`).first().click();
            await page.waitForTimeout(1500);
            await page.locator("//a[@class='btn btn-brand btn-sm']").click();

            await page.locator('[name="name"]').nth(1).fill(KolumnName)
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
            await page.waitForTimeout(1500)
        });

        await test.step('проверка фильтрации', async () => {
            await page.locator('input[name="name"]').fill(KolumnName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${KolumnName}']`)).toBeVisible();
        });

        await test.step('редактирование колонны', async () => {
            await page.getByText(KolumnName).click();
            await page.locator('[name="name"]').nth(0).fill(editKolumnName)
            await page.locator('[class="btn btn-brand btn-sm"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
            await page.waitForTimeout(1500)
            await page.locator('[class="book-show__close close close--sm"]').click();
        })
        await test.step('проверка фильтрации после редактирования', async () => {
            await page.locator('input[name="name"]').fill(editKolumnName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${editKolumnName}']`)).toBeVisible();
            await expect(page.locator('[class="text-center"]').nth(0)).toHaveText('Нет')//скрыт от планирования или нет
        });

        await test.step('Удаление колонны', async () => {
            await page.getByText(editKolumnName).click();
            await page.locator('[class="c-dropd__btn"]').click();
            await page.locator("//li[contains(text(),'Удалить')]").click();
            await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
            await expect(page.getByText('Ваш запрос выполнен успешно.')).toBeVisible();
        })
        await test.step('проверка фильтрации после удаления', async () => {
            await page.reload()
            await page.locator('input[name="name"]').fill(editKolumnName);
            await page.waitForTimeout(2500)
            await expect(page.locator(`//a[normalize-space()='${editKolumnName}']`)).not.toBeVisible();
        });
    });
});