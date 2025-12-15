import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
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

const legalPersonInfo = {
    name: faker.company.name(),
    inn: getRandomINNs(1)[0],
    ndsType: '20%',
    paymentType: 'Безналичный'
}
test.describe('Справочник Контрагенты', () => {
    let loginPage: LoginPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
    });

    test('создание организации(юр лица) и фильтрация', async ({ page }) => {
        await test.step('Логин', async () => {
            await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
        });
        await test.step('Создание юридического лица', async () => {
            await page.locator("//SPAN[@class='sidebar__link__text'][text()='Справочники']").click();
            await page.locator(`//A[@class='sidebar__link'][text()='Контрагенты']`).first().click();
            await page.locator("//a[contains(text(),'Организации')]").click();
            await page.waitForTimeout(1500);
            await page.locator("//a[@class='btn btn-brand btn-sm']").click();

            await page.locator('input[name="name"]').fill(legalPersonInfo.name);
            await page.locator('input[name="inn"]').fill(legalPersonInfo.inn);
            await page.locator('#ndsTypeIdContainer').click();
            await page.locator('#ndsTypeIdContainer').type(legalPersonInfo.ndsType, { delay: 100 });
            await page.locator(`text=${legalPersonInfo.ndsType}`).nth(1).click(); //тип НДС

            await page.locator('#paymentTypeIdContainer').click();
            await page.locator('#paymentTypeIdContainer').type(legalPersonInfo.paymentType, { delay: 100 });
            await page.locator(`text=${legalPersonInfo.paymentType}`).nth(1).click(); //тип оплаты

            await page.locator('[type="submit"]').click();
            await page.waitForSelector("//div[@class='notification notification-success notification-enter-done']", {
                state: 'hidden',
                timeout: 5000,
            });
            await page.waitForTimeout(1500)
            await page.locator("//div[@class='notification notification-success notification-enter-done']");
        });

        await test.step('проверка фильтрации', async () => {
            await page.goto(`${process.env.url}/legal-persons`)
            await page.locator('input[name="name"]').fill(legalPersonInfo.name);
            await page.waitForTimeout(6000)
            await page.waitForSelector(`//a[contains(text(),'${legalPersonInfo.name}')]`, {
                state: 'visible',
                timeout: 5000,
            });
            await page.locator('input[name="inn"]').fill(legalPersonInfo.inn);
            await page.waitForTimeout(6000)
            await page.waitForSelector(`//div[normalize-space()='${legalPersonInfo.inn}']`, {
                state: 'visible',
                timeout: 5000,
            });
            await page.locator('#ndsTypeIdContainer').click();
            await page.locator('#ndsTypeIdContainer').type(legalPersonInfo.ndsType, { delay: 100 });
            await page.locator('#ndsTypeIdContainer').press('Enter');
            await page.waitForTimeout(6000)
            await page.waitForSelector(`//div[normalize-space()='${legalPersonInfo.ndsType}']`, {
                state: 'visible',
                timeout: 5000,
            });
        });

        await test.step('Проверка автозаполнения полей при создании заявки', async () => {
            await page.goto(`${process.env.url}/bids/new`)
            await page.locator('#legalPersonIdContainer').click();
            await page.locator('#legalPersonIdContainer').type(legalPersonInfo.name, { delay: 100 });
            await page.locator(`text=${legalPersonInfo.name}`).nth(1).click(); //тип НДС
            await expect(page.locator('#ndsTypeIdContainer')).toHaveText(legalPersonInfo.ndsType)
            await expect(page.locator('#paymentTypeIdContainer')).toHaveText(legalPersonInfo.paymentType)
        });
    });
});