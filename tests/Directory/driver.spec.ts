import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { faker } from '@faker-js/faker/locale/ru';
import moment from 'moment';
const bio = {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  patronymic: faker.person.middleName(),
  phoneNumber: faker.phone.number({ style: 'international' }).replace('+7', ''),
  comment: `${moment().format()}Cсылки на документы`,
};
const editBio = {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  patronymic: faker.person.middleName(),
  phoneNumber: faker.phone.number({ style: 'international' }),
  comment: `${moment().format()}Cсылки на документы`,
};
test.describe('Driver test', () => {
  let loginPage: LoginPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
  });

  test('CRUD по водителю', async ({ page }) => {
    await test.step('Логин', async () => {
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    });
    await test.step('Создание водителя', async () => {
      await page.locator("//SPAN[@class='sidebar__link__text'][text()='Справочники']").click();
      await page.locator(`//A[@class='sidebar__link'][text()='Водители']`).first().click();
      await page.locator("//A[@class='btn btn-brand btn-sm'][text()='Пригласить водителя']").click();
      await page.locator('input[name="lastName"]').fill(bio.lastName);
      await page.locator('input[name="firstName"]').fill(bio.firstName);
      await page.locator('input[name="patronymic"]').fill(bio.patronymic);
      await page.locator('input[name="phoneNumber"]').fill(bio.phoneNumber);
      await page.locator('textarea[name="comment"]').fill(bio.comment);
      await page.locator('[class="btn btn-brand btn-sm modal-window__footer-action"]').click();
      await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
        state: 'hidden',
        timeout: 5000,
      });
      await page.locator("//div[@class='notification notification-success notification-enter-done']");
    });

    await test.step('проверка фильтрации', async () => {
      await page.locator('input[name="user/fullName"]').fill(`${bio.lastName} ${bio.firstName} ${bio.patronymic}`);
      await page.waitForSelector(`//a[contains(text(),'${bio.lastName} ${bio.firstName} ${bio.patronymic}')]`, {
        state: 'visible',
        timeout: 5000,
      });
      await page.locator('input[name="user/phoneNumber"]').fill(bio.phoneNumber);
      await page.waitForSelector(`//div[normalize-space()='+7${bio.phoneNumber}']`, {
        state: 'visible',
        timeout: 5000,
      });
      await page.locator("//div[contains(text(),'******')]"); //пинкод
    });

    await test.step('редактирование водителя', async () => {
      await page.locator('input[name="user/fullName"]').fill(`${bio.lastName} ${bio.firstName} ${bio.patronymic}`);
      await page.locator(`//a[contains(text(),'${bio.lastName} ${bio.firstName} ${bio.patronymic}')]`).click();
      await page.locator('input[name="lastName"]').fill(editBio.lastName);
      await page.locator('input[name="firstName"]').fill(editBio.firstName);
      await page.locator('input[name="patronymic"]').fill(editBio.patronymic);
      await page.locator('input[name="phoneNumber"]').clear();
      await page.locator('input[name="phoneNumber"]').fill(editBio.phoneNumber);
      await page.locator('textarea[name="comment"]').fill(editBio.comment);
      await page.locator("//div[@class='btn btn-brand btn-sm']").click();
      await page.locator("//div[@class='notification notification-success notification-enter-done']");
    });

    await test.step('проверка фильтрации после редактирования', async () => {
      await page.locator("//div[@class='book-show__close close close--sm']").click();
      await page.locator('input[name="user/fullName"]').fill(`${bio.lastName} ${bio.firstName} ${bio.patronymic}`);
      await expect(
        page.locator(`//a[contains(text(),'${bio.lastName} ${bio.firstName} ${bio.patronymic}')]`)
      ).not.toBeVisible();
      await page
        .locator('input[name="user/fullName"]')
        .fill(`${editBio.lastName} ${editBio.firstName} ${editBio.patronymic}`);
      await page.locator('input[name="user/phoneNumber"]').fill(editBio.phoneNumber);
      await page.locator("//div[@class='inline-btn inline-btn--refresh']").click();
      await page.waitForSelector(
        `//a[contains(text(),'${editBio.lastName} ${editBio.firstName} ${editBio.patronymic}')]`,
        {
          state: 'visible',
          timeout: 5000,
        }
      );
    });

    await test.step('удаление водителя', async () => {
      await page
        .locator(`//a[contains(text(),'${editBio.lastName} ${editBio.firstName} ${editBio.patronymic}')]`)
        .click();
      await page.locator('.c-dropd__btn').click();
      await page.locator("//li[contains(text(),'Удалить')]").click();
      await page.locator("//div[@class='modal-window__body']");
      await page.locator("//div[@class='btn btn-brand btn-sm modal-window__footer-action']").click();
      await page.locator("//div[@class='notification notification-success notification-enter-done']");
    });
    await test.step('проверка данных после удаления', async () => {
      await page
        .locator('input[name="user/fullName"]')
        .fill(`${editBio.lastName} ${editBio.firstName} ${editBio.patronymic}`);
      await expect(
        page.locator(`//a[contains(text(),'${editBio.lastName} ${editBio.firstName} ${editBio.patronymic}')]`)
      ).not.toBeVisible();
      await await page.locator("//select[@name='isDeleted']").selectOption('Удаленные');
      await page.waitForSelector(
        `//a[contains(text(),'${editBio.lastName} ${editBio.firstName} ${editBio.patronymic}')]`,
        {
          state: 'visible',
          timeout: 5000,
        }
      );
    });
  });
});
