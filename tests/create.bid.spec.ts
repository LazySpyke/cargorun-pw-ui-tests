import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { BidPage, ExpressBid, BidPointsPage } from "../pages/BidsPage";
import APIRequests from "../api/apiRequests";
import APIRequestsClient from "../api/clienApiRequsets";
// import { globals } from '../globals'; // Импортируйте глобальные переменные
import {
  getAuthData,
  getUsedCar
} from "../database";


test.describe("Create Bid", () => {
  let loginPage: LoginPage;
  let bidPage: BidPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
  });

  test("should log in successfully with valid credentials", async ({ page }) => {
    await test.step("Log in", async () => {
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    });
    await test.step("url check", async () => {
      await expect(page).toHaveURL("/monitoring"); // Проверяем, что URL изменился на /dashboard
    });
    await test.step("create bid", async () => {
      const clienApi = new APIRequestsClient();
      const carForBid = await clienApi.getCar(`${process.env.url}/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=20&$skip=0`,
        await getAuthData(36)
      );
      bidPage = new BidPage(page);
      await bidPage.goto()
      await bidPage.CreateCommonBid(carForBid.number)
    })
  });
});


test.beforeAll(async () => {
  const clienApi = new APIRequestsClient();
  await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
