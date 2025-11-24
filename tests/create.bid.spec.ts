import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { BidPage } from '../pages/BidsPage';
import { BidCreateInfo, gerateBidCreateInfo } from '../pages/Fixtures';
import APIRequestsClient from '../api/clienApiRequsets';
const clienApi = new APIRequestsClient();
test.describe('Создание разных заявок с фронта', () => {
  let loginPage: LoginPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
  });

  test('Создание обычной заявки', async ({ page }) => {
    await test.step('Логин', async () => {
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    });
    await test.step('Создание заявки', async () => {
      const bidFixture = new BidCreateInfo(page);
      const bidPage = new BidPage(page);
      const bidInfo: gerateBidCreateInfo = await bidFixture.CommonBid();
      await bidPage.goto();
      await bidPage.CreateCommonBid(bidInfo);
      await bidPage.BidFieldReconciliation(bidInfo, 'Черновик');
    });
  });
  test('Создание порожней заявки', async ({ page }) => {
    await test.step('Логин', async () => {
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    });
    await test.step('Создание заявки', async () => {
      const bidFixture = new BidCreateInfo(page);
      const bidPage = new BidPage(page);
      const bidInfo: gerateBidCreateInfo = await bidFixture.EmptyBid();
      await bidPage.goto();
      await bidPage.CreateEmptyBid(bidInfo);
      await bidPage.BidFieldReconciliation(bidInfo, 'Черновик');
      await page.close();
    });
  });
});

test.beforeAll(async () => {
  await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
