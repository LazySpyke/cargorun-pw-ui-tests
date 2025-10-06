import { test } from '@playwright/test';
import APIRequestsClient from '../api/clienApiRequsets';
import { faker } from '@faker-js/faker/locale/ru';

const clienApi = new APIRequestsClient();
test.describe('Create Bid', () => {
  test('Создание обычной заявки', async ({ page }) => {
    await test.step('Логин', async () => {
      await page.goto('/registration');
      await page.locator('[name="name"]').fill(`${faker.company.name}`);
    });
  });
});
