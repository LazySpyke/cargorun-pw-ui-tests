import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { getAuthData } from '../../database';
import { BidCreateInfo } from '../../pages/Fixtures';
import moment from 'moment';
import APIRequestsClient from '../../api/clienApiRequsets';
import APIBid from '../../api/bidApi';
const clienApi = new APIRequestsClient();
const bidApi = new APIBid();
let bidInfo: any;
test.describe('Отчёты с обычной завершенной вручную заявкой', () => {
  let loginPage: LoginPage;
  let bidResponse: any;
  let bidInfoResponse: any;
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
        planEnterLoadDate: moment().subtract(6, 'h').format('YYYY-MM-DDTHH:mm'),
        planEnterUnloadDate: moment().subtract(1, 'h').format('YYYY-MM-DDTHH:mm'),
        loadAddress: 'Челны',
        unloadAddress: 'Москва',
        userIdForFilter: 36
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
      await page.locator('input[name="startDate"]').fill(moment().subtract(6, 'h').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().subtract(1, 'h').format('DD.MM.YYYY HH:mm'));
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('input[name="car"]').fill(bidInfo.carOption.number);
      await page.waitForTimeout(5000);
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click();
      bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(36));
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
      await expect(page.locator(`[data-numberofdays="${bidResponse.id}"]`)).toHaveText('0,40');
      const profitabilityOfBidSettings: any = await clienApi.GetObjectResponse(
        `${process.env.url}/api/organizationProfile/getProfitabilityOfBidSettings`,
        await getAuthData(36)
      );
      const planKm = Number(bidInfoResponse.planMileage / 100000).toFixed(2);
      const fuelcost =
        Number(planKm) *
        profitabilityOfBidSettings.averageFuelConsumption *
        profitabilityOfBidSettings.averageFuelCostPerLiter;
      await expect(page.locator(`[data-fuelcost="${bidResponse.id}"]`)).toHaveText(
        fuelcost.toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      const finalprofit = bidInfo.price - (fuelcost + profitabilityOfBidSettings.costOfOneDay * 0.4);
      const finalprofitText: string = await page.innerText(`[data-finalprofit="${bidResponse.id}"]`);
      // Удаляем неразрывные пробелы
      const cleanedStr = finalprofitText.replace(/\u00A0/g, '');
      // Меняем запятую на точку
      const normalizedStr = cleanedStr.replace(',', '.');
      // Преобразуем в число
      const numberValue = parseFloat(normalizedStr);
      const epsilon: number = 2;
      if (numberValue - finalprofit < epsilon && numberValue - finalprofit > -epsilon) {
        console.log(`данные корректные${numberValue - finalprofit},${numberValue - finalprofit}`);
      } else {
        throw new TypeError(`не совпадает ожидаемое значение ${numberValue} текст такой, ${finalprofit} расчёт такой`);
      }
    });
    await test.step('Проверка 2.Отчет "Отклонения по точкам" ', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator(`[name='Отчет "Отклонения по точкам"']`).click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(6, 'h').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().subtract(1, 'h').format('DD.MM.YYYY HH:mm'));
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.waitForTimeout(5000);
      await page.locator('input[name="bidId"]').fill(String(bidResponse.id));
      await page.waitForTimeout(5000);
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click();
      await page.locator(`[data-car="${bidInfo.carOption.number}"]`).click();
      await page.locator(`[data-bidid="${bidResponse.id}"]`).click();

      await page.locator("//div[@id='entry']//div[5]//div[1][1]//span[1]//i[2]").click();
      await page.locator("//i[@class='r-table__sort-icon--up r-table__sort-icon--active']").click(); //переключение сортировки по убыванию типов точек
      //точки
      await expect(page.locator(`[data-bidpointtype="${bidResponse.id}"]`).first()).toHaveText('Точка загрузки');
      await expect(page.locator(`[data-bidpointtype="${bidResponse.id}"]`).nth(1)).toHaveText('Точка выгрузки');
      //адрес точки
      await expect(page.locator(`[data-address="${bidResponse.id}"]`).first()).toHaveText('Набережные Челны');
      await expect(page.locator(`[data-address="${bidResponse.id}"]`).nth(1)).toBeEmpty();
      // плановые даты въезда точки загрузки
      await expect(page.locator(`[data-planenterdateoffset="${bidResponse.id}"]`).first()).toHaveText(
        moment(bidInfoResponse.bidPoints[0].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      await expect(page.locator(`[data-planenterdateoffset="${bidResponse.id}"]`).nth(1)).toHaveText(
        moment(bidInfoResponse.bidPoints[1].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      //плановое время выезда "до" точки загрузки
      await expect(page.locator(`[data-secondaryplanenterdateoffset="${bidResponse.id}"]`).first()).toBeEmpty();
      await expect(page.locator(`[data-secondaryplanenterdateoffset="${bidResponse.id}"]`).nth(1)).toBeEmpty();
      //плановое время факт даты
      await expect(page.locator(`[data-factenterdateoffset="${bidResponse.id}"]`).first()).toHaveText(
        moment(bidInfoResponse.bidPoints[0].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      await expect(page.locator(`[data-factenterdateoffset="${bidResponse.id}"]`).nth(1)).toHaveText(
        moment(bidInfoResponse.bidPoints[1].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      //отклонение(въезд)
      await expect(page.locator(`[data-enterdeviation="${bidResponse.id}"]`).first()).toHaveText('0м');
      await expect(page.locator(`[data-enterdeviation="${bidResponse.id}"]`).nth(1)).toHaveText('0м');
      //план выезд
      await expect(page.locator(`[data-planleavedateoffset="${bidResponse.id}"]`).first()).toHaveText(
        moment(bidInfoResponse.bidPoints[0].planLeaveDateOffset, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      await expect(page.locator(`[data-planleavedateoffset="${bidResponse.id}"]`).nth(1)).toHaveText(
        moment(bidInfoResponse.bidPoints[1].planLeaveDateOffset, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      //факт выезд
      await expect(page.locator(`[data-factleavedateoffset="${bidResponse.id}"]`).first()).toHaveText(
        moment(bidInfoResponse.bidPoints[0].loadUnloadedAtByLogist, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      await expect(page.locator(`[data-factleavedateoffset="${bidResponse.id}"]`).nth(1)).toHaveText(
        moment(bidInfoResponse.bidPoints[1].loadUnloadedAtByLogist, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')
      );
      // отклонение(выезд)
      await expect(page.locator(`[data-leavedeviation="${bidResponse.id}"]`).first()).toHaveText('-59м');
      await expect(page.locator(`[data-leavedeviation="${bidResponse.id}"]`).nth(1)).toHaveText('-59м');
    });
    await test.step('Проверка 4.Отчет маржинальности', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator(`[name="Отчет маржинальности"]`).click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(6, 'h').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().subtract(1, 'h').format('DD.MM.YYYY HH:mm'));
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.waitForTimeout(5000);
      await page.locator('input[name="bidId"]').fill(String(bidResponse.id));
      await page.waitForTimeout(5000);
      await page.locator(`//SPAN[contains(text(),'С заявками')]`).click();
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click(); //раскрытие по логисту
      await page.waitForTimeout(2500);
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click(); //раскрытие по машине
      await page.waitForTimeout(2500);
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click(); //раскрытие по водителю
      await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toHaveText(`${bidResponse.id}`);
      await expect(page.locator(`[data-planned-start-date="${bidResponse.id}"]`)).toHaveText(
        `${moment(bidInfoResponse.bidPoints[0].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')}`
      );
      await expect(page.locator(`[data-planned-end-date="${bidResponse.id}"]`)).toHaveText(
        `${moment(bidInfoResponse.bidPoints[1].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')}`
      );
      await expect(page.locator(`[data-fact-or-estimated-start-date="${bidResponse.id}"]`)).toHaveText(
        `${moment(bidInfoResponse.bidPoints[0].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')}`
      );
      await expect(page.locator(`[data-fact-or-estimatedend-date="${bidResponse.id}"]`)).toHaveText(
        `${moment(bidInfoResponse.bidPoints[1].planEnterDate, 'YYYY-MM-DDTHH:mm').format('DD.MM.YYYY HH:mm')}`
      );
      await page.waitForSelector("//div[contains(text(),'100 000,00')]", {
        state: 'visible'
      })
    });
  });
});

test.beforeAll(async () => {
  await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
  await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
