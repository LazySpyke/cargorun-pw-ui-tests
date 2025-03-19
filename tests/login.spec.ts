import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
test.describe("Login Tests", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
  });

  test("should log in successfully with valid credentials", async ({
    page,
  }) => {
    await test.step("Log in", async () => {
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    });

    await test.step("url check", async () => {
      await expect(page).toHaveURL("/monitoring"); // Проверяем, что URL изменился на /dashboard
    });

  });
  test("should show error message for invalid credentials", async () => {
    await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain("Invalid credentials"); // Проверяем сообщение об ошибке
  });
});
