import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import moment from 'moment';
test.describe('Синхронизация с биллингом', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Провекра статуса синхронизации после ручного обновления', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Ручная синхронизация', async () => {
            await page.getByTestId('header-dropd').click();
            await page.getByTestId('header-billing').click();
            await page.locator(`//h5[contains(text(),'ООО "АСК ЛОГИСТИК"')]`) //наименование компании из биллиннга
            await page.locator('[class="badge mr-1 badge-success"]') //статус синхронизации
            await page.waitForTimeout(5000)
            await page.locator("//div[@class='btn btm-sm btn-brand mt-3']").click(); //синхронизация ручная
            await page.waitForTimeout(6000);
            await page.locator('[class="badge mr-1 badge-success"]') //статус синхронизации
            await expect(page.locator("//div[@class='small']")).toHaveText(moment().add(1, 'h').format("Синхронизация: Успешно DD.MM.YYYY HH:mm"))
        });
    });
});
