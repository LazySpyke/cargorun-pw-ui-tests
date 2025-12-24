import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
test.describe('Пользователь техподдержки', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('сверка доступных справочников', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.techSupportEmail as string, process.env.techSupportPassword as string);
        });
        await test.step('Проверка отсутствия чата техподдержки', async () => {
            await page.waitForTimeout(15000)
            await expect(page.locator('[class="omnidesk-email-widget--item omnidesk-email-widget--chat"]')).not.toBeVisible();
        });
    });
});
