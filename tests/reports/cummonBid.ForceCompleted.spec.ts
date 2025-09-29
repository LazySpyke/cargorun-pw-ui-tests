import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();

test.describe('Create Bid', () => {
  let loginPage: LoginPage;
  let bidInfo: any;
  let bidResponse: any;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto(); // Переходим на страницу логина перед каждым тестом
  });

  test('Создание обычной заявки', async ({ page }) => {
    await test.step('Логин', async () => {
      await loginPage.login(process.env.rootMail as string, process.env.rootPassword as string);
    });
    await test.step('Создание заявки и запуск в работу', async () => {
      const bidFixture = new BidCreateInfo(page);
      bidInfo = await bidFixture.ApiCommonBid({
        price: 100000,
        paymentTypeId: 176,
        ndsTypeId: 175,
        planEnterLoadDate: moment().subtract(12, 'h').format('YYYY-MM-DDTHH:mm'),
        planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
      });
      await bidApi.init();
      const bidList = await clienApi.GetObjectResponse(
        `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
        await getAuthData(36)
      );
      bidList.forEach(async (element) => {
        bidApi.cancelBid(element.id, await getAuthData(36));
      });
      bidResponse = await bidApi.apply(bidInfo, await getAuthData(36));
      await bidApi.setStatus(bidResponse.id, await getAuthData(36));
    });
    await test.step('завершение заявки', async () => {
      await page.waitForTimeout(60000);
      await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(36));
    });
    await test.step('Проверка 1.Общего отчёта', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator('[name="Общий отчет"]').click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(12, 'h').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().subtract(1, 'h').format('DD.MM.YYYY HH:mm'));
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('input[name="car"]').fill(bidInfo.carOption.number);
      await page.waitForTimeout(5000);
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click();
      const bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(36));
      console.log(bidInfoResponse);
      await expect(page.locator(`[data-activemileage="${bidInfo.carOption.number}"]`)).toHaveText(
        Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-overallmileage="${bidInfo.carOption.number}"]`)).toHaveText(
        Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-overallbidsprice="${bidInfo.carOption.number}"]`)).toHaveText(
        bidInfo.price.toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-output="${bidInfo.carOption.number}"]`)).toHaveText('93,02');
      await page.locator(`[data-car="${bidInfo.carOption.number}"]`).nth(1).click();
      await page.locator(`[href="/bids/bid/${bidResponse.id}"]`);
      await expect(page.locator(`[data-counterpartyname="${bidResponse.id}"]`)).toHaveText(
        bidInfoResponse.cargoOwnerDictionaryItem.name
      );
      await expect(page.locator(`[data-externalid="${bidResponse.id}"]`)).toBeEmpty();
      await expect(page.locator(`[data-route="${bidResponse.id}"]`)).toHaveText('Набережные Челны - ');
      await expect(page.locator(`[data-executiondaterange="${bidResponse.id}"]`)).toHaveText(
        `${moment(bidInfoResponse.bidPoints[0].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')} (+03:00) - ${moment(bidInfoResponse.bidPoints[1].planEnterDate, 'YYYY-MM-DDTHH:mm').add(1, 'm').format('DD.MM.YYYY HH:mm')} (+03:00)`
      );
      await expect(page.locator(`[data-activemileage="${bidResponse.id}"]`)).toHaveText(
        Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-emptymileage="${bidResponse.id}"]`)).toHaveText('0,00');
      await expect(page.locator(`[data-overallmileage="${bidResponse.id}"]`)).toHaveText(
        Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-overallbidprice="${bidResponse.id}"]`)).toHaveText(
        bidInfo.price.toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-averageplanweight="${bidResponse.id}"]`)).toHaveText('0,00');
      await expect(page.locator(`[data-output="${bidResponse.id}"]`)).toHaveText(
        (bidInfo.price / Math.ceil(bidInfoResponse.planMileage / 1000)).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-numberofdays="${bidResponse.id}"]`)).toHaveText('0,88');
      const profitabilityOfBidSettings: any = await clienApi.GetObjectResponse(
        `${process.env.url}/api/organizationProfile/getProfitabilityOfBidSettings`,
        await getAuthData(36)
      );
      console.log(
        `${bidInfoResponse.planMileage / 100000}\n${profitabilityOfBidSettings.averageFuelConsumption}\n${profitabilityOfBidSettings.averageFuelCostPerLiter}`
      );
      const fuelcost =(Math.ceil(bidInfoResponse.planMileage / 100000) *
        profitabilityOfBidSettings.averageFuelConsumption) *
        profitabilityOfBidSettings.averageFuelCostPerLiter;
      await expect(page.locator(`[data-fuelcost="${bidResponse.id}"]`)).toHaveText(
        fuelcost.toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
    });
  });
});

test.beforeAll(async () => {
  await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
