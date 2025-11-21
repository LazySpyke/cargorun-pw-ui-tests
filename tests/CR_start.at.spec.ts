import { expect, test } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/ru';
import { LoginPage } from '../pages/LoginPage';
const innList: string[] = [
  "7707083893", "7728168974", "7816066770", "7702012420", "7704449740",
  "7705514788", "7729168973", "7705586390", "7710130434", "7705421300",
  "7805024330", "7704068299", "7808012345", "7723432780", "7701234567",
  "7807123456", "7709271001", "7709321252", "7709166744", "7706012345",
  "7712345678", "7723456789", "7734567890", "7745678901", "7756789012",
  "7767890123", "7778901234", "7789012345", "7790123456", "7801234567",
  "7812345678", "7823456789", "7834567890", "7845678901", "7856789012",
  "7867890123", "7878901234", "7889012345", "7890123456", "7901234567",
  "7912345678", "7923456789", "7934567890", "7945678901", "7956789012",
  "7967890123", "7978901234", "7989012345", "7990123456", "7701112223",
  "7702223334", "7703334445", "7704445556", "7705556667", "7706667778",
  "7707778889", "7708889990", "7709990001", "7721122233", "7732233344",
  "7743344455", "7754455566", "7765566677", "7776677788", "7787788899",
  "7798899900", "7800001112", "7811112223", "7822223334", "7833334445",
  "7844445556", "7855556667", "7866667778", "7877778889", "7888889990",
  "7899990001", "7900002223", "7911113334", "7922224445", "7933335556",
  "7944446667", "7955557778", "7966668889", "7977779990", "7988880001",
  "7999991112"
];
function getRandomINNs(count: number): string[] {
  if (count > innList.length) {
    throw new Error("Запрашиваемое количество превышает доступный список");
  }
  // Перемешиваем массив и берем первые n элементов
  const shuffled = innList.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
function generateRandomNumber9Digits(): string {
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += Math.floor(Math.random() * 11).toString();
  }
  return result;
}
// const clienApi = new APIRequestsClient();
type company = {
  name: string;
  email: string;
  phone: string;
  inn: string;
  kpp?: string;
  password: string;
};
let newCompany: company


test.describe('Самостоятельная регистрация', () => {
  test('Регистрация ИП', async ({ page }) => {

    await test.step('открытие окна регистрации', async () => {
      newCompany = {
        name: faker.company.name(),
        email: `${faker.word.sample()}-${faker.word.sample()}@cargorun.ru`,
        phone: generateRandomNumber9Digits(),
        inn: getRandomINNs(1)[0],
        password: faker.internet.password()
      }
      console.log(newCompany)
      await page.goto('/registration');
      await page.locator('[name="name"]').fill(newCompany.name);
      await page.locator('[name="email"]').fill(newCompany.email);
      await page.locator('[name="phoneNumber"]').fill(newCompany.phone);
      await page.locator('[name="inn"]').fill(newCompany.inn);
      await page.locator('[name="password"]').fill(newCompany.password);
      await page.locator('[name="confirmPassword"]').fill(newCompany.password);
      await page.locator('[type="submit"]').click();
      // await expect(page.locator("//DIV[@class='message']")).toHaveText("Вы успешно зарегистрировались, можете войти в систему")
      // await page.locator(`//DIV[@class='message'][text()="Вы успешно зарегистрировались, можете войти в систему"]`)
      await page.waitForTimeout(5000);
    });
    await test.step('авторизация и ввод данных системы мониторинга', async () => {
      await page.selectOption('#type', { label: 'Виалон (Wialon)' });
      await page.waitForTimeout(5000);
      await page.locator('[name="host"]').fill(process.env.relayCopyWialonHost as string)
      await page.locator('[name="login"]').fill(process.env.relayCopyWialonLogin as string)
      await page.locator('[name="password"]').fill(process.env.relayCopyWialonPassword as string)
      await page.locator('[type="submit"]').click();
      await page.waitForTimeout(2500);
    })
    await test.step('ввод данных по одной машине', async () => {
      await page.locator('[class="switch__slider"]').first().click();
      await page.locator('[name="number"]').first().fill("А111АА/111")
      await page.locator('#brandTypeIdContainer').first().click();
      await page.locator('#brandTypeIdContainer').first().type("КАМАЗ", { delay: 100 });
      await page.locator(`text=КАМАЗ`).nth(1).click();
      await page.locator('#typeIdContainer').first().click();
      await page.locator('#typeIdContainer').first().type("Тент", { delay: 100 });
      await page.locator(`text=Тент`).nth(1).click();
      await page.locator('[class="r-form__button"]').click();
      await page.locator('[title="Дашборд"]')
    })
    await test.step('проверка корректности созданной машины и трекера', async () => {
      await page.locator("//span[contains(text(),'Справочники')]").click();
      await page.locator("//a[@title='Грузовики']").click();
      await page.locator('[name="number"]').fill("А111АА/111")
      await page.locator("//a[contains(text(),'А111АА/111')]")
      const trackerText = await page.textContent("div[role='rowgroup'] div:nth-child(12)"); //текст трекера
      expect(trackerText).not.toBeNull();
      const trackerAttachDate = await page.textContent("div[role='rowgroup'] div:nth-child(13)"); //текст трекера
      expect(trackerAttachDate).not.toBeNull();
    })
    await test.step('удаление созданного Relay', async () => {
      await page.goto(process.env.relayTestHost as string);
      await page.locator('[type="email"]').fill(process.env.relayTestMail as string)
      await page.locator('[type="password"]').fill(process.env.relayTestPassword as string)
      await page.locator('[type="submit"]').click();
      await page.waitForTimeout(5000);
      await page.locator('[id="inputRet"]').fill(`CR_${newCompany.name}`) //добавляется CR_ чтоб разделять по типам
      await page.locator('[id="inputRet"]').press('Enter');
      await page.waitForTimeout(5000);
      await page.locator('[data-confirm-buttontext="Переключить"]:visible').click();
      await page.locator("//button[contains(text(),'Переключить')]").click();
      await page.waitForTimeout(2500);
      await page.locator('[data-confirm-buttontext="Удалить"]:visible').nth(1).click(); //кнопка удаления
      await page.locator("//button[@class='swal2-confirm swal2-styled']").click(); //подтверждение

      await page.goto(`${process.env.relayTestHost}/Configurations`)
      await page.locator('[id="inputName"]').fill(`CR_${newCompany.name}`)
      await page.locator('[id="inputName"]').press('Enter');
      await page.waitForTimeout(2500);
      await page.locator('[data-confirm-buttontext="Удалить"]:visible').click();
      await page.locator("//button[@type='button'][contains(text(),'Удалить')]").click();
    });
    await test.step('Проверка появления в списке организации и проверка фильтра по саморегистрации', async () => {
      const loginPage = new LoginPage(page);
      await loginPage.goto()
      await page.getByTestId('header-logout').click();
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
      await page.locator("//span[contains(text(),'Админка')]").click();
      await page.locator("//span[contains(text(),'Все организации')]").click();
      await page.locator('select[class="r-item__filter-select r-item__filter-select--wide field-wrap__input"]').first().selectOption({ label: 'Да' });
      await page.waitForTimeout(60000)
    })
  });
});
