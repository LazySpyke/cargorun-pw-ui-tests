import { test, expect } from "@playwright/test";
import { getAuthData } from "../database";
import APIRequestsClient from "../api/clienApiRequsets";
test("Проверка API-запроса с авторизацией", async ({ page }) => {
  const clienApi = new APIRequestsClient();
  await page.waitForTimeout(3000);
  var carForBid = await clienApi.getCar(
    "https://test.cargorun.ru/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=20&$skip=0",
    await getAuthData(36)
  );
  console.log(`машина для работы ${await JSON.stringify(carForBid)}`);
  // expect(data).toBeDefined();
});
