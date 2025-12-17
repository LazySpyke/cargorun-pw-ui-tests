import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { getAuthData } from '../database';
import moment from 'moment';
import DebugAPIRequestsClient from '../api/debugRequests'
const debugApi = new DebugAPIRequestsClient();
test.describe('Настройка отправки данных ассистенту', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('Проверка редактирования данных по времени отправки ассистенту', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Редактирование времени отправки', async () => {
            await page.locator('[title="Ассистент"]').click();
            await page.locator("//div[@class='inline-btn inline-btn--gear']").click();
            await page.waitForSelector("//strong[contains(text(),'Динамика изменения ключевых показателей парка')]", {
                state: 'visible'
            })
            await page.waitForSelector("//strong[contains(text(),'Отчет по анализу вовлеченности и эффективности')]", {
                state: 'visible'
            })
            for (let nthIndex: number = 0; nthIndex <= 3; nthIndex++) {
                await page.locator('[type="time"]').nth(nthIndex).fill(moment().format("HH:mm"))
            }
            await page.locator('[type="submit"]').click();
            await page.waitForSelector('[class="notification notification-success notification-enter-done"]', {
                state: 'visible'
            })
        });

        await test.step('Ожидаю что отправится 2 отчёта через минуту', async () => {
            await debugApi.init();
            await debugApi.runTask('IProcessInvolvementAnalysisReminderGrain', await getAuthData(process.env.rootId))
            await page.waitForTimeout(30000)
            await debugApi.runTask('ISendAssistantChatReportNotificationsReminderGrain', await getAuthData(process.env.rootId))
            await page.waitForTimeout(1500)
        })
    });
});
