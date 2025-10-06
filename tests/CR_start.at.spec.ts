import { test } from '@playwright/test';
import APIRequestsClient from '../api/clienApiRequsets';
import { faker } from '@faker-js/faker/locale/ru';
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
  for (let i = 0; i < 9; i++) {
    result += Math.floor(Math.random() * 10).toString();
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
test.describe('Create Bid', () => {
  test('Создание обычной заявки', async ({ page }) => {
    await test.step('Логин', async () => {
      const newCompany: company = {
        name: faker.company.name(),
        email: `${faker.word.sample()}@cargorun.ru`,
        phone: generateRandomNumber9Digits(),
        inn: getRandomINNs(1)[0],
        password: faker.internet.password()
      }
      console.log(newCompany)
      await page.goto('/registration');
      await page.locator('[name="name"]').fill(newCompany.name);

    });
  });
});
