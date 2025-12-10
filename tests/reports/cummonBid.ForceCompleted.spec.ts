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
const adminId = 36
const externalId = `тест время ${moment().format()}`
test.describe('Отчёты с обычной завершенной вручную заявкой', () => {
  let loginPage: LoginPage;
  let bidResponse: any;
  let bidInfoResponse: any;
  let carMountKm: any;
  let filterLogist: any
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
        userIdForFilter: adminId,
        cargosWeight: 10,
        externalId: externalId,
        carFilter: `logistId ge 1 and isDeleted eq false and lastFixedAt ge 2024-08-31T21:00:00.000Z`
      });
      await bidApi.init();
      const bidList = await clienApi.GetObjectResponse(
        `${process.env.url}/api/bids/getlist?$filter=carIds/any(carids:carids in (${bidInfo.carOption.carId}))and ((((status in ('Started')) or (status in ('Planned')))))&$orderby=id desc&$top=30&$skip=0`,
        await getAuthData(adminId)
      );
      bidList.forEach(async (element) => {
        bidApi.cancelBid(element.id, await getAuthData(adminId));
      });
      bidResponse = await bidApi.apply(bidInfo, await getAuthData(adminId));
      await bidApi.setStatus(bidResponse.id, await getAuthData(adminId));
    });
    await test.step('завершение заявки', async () => {
      await page.waitForTimeout(60000);
      await bidApi.ForceCompletedBid(bidResponse.id, await getAuthData(adminId));
    });
    await test.step('Проверка 1.Общего отчёта', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator('[name="Общий отчет"]').click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(7, 'h').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().add(1, 'h').format('DD.MM.YYYY HH:mm'));
      await page.waitForTimeout(500)
      await page.locator('[class="book-show__title"]').click(); //чтоб датапикеры скрылись
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('input[name="car"]').fill(bidInfo.carOption.number);
      await page.waitForTimeout(5000);
      await page.locator('[class="r-item__expander icon-uEAAE-angle-right-solid"]').click();
      bidInfoResponse = await bidApi.GetBidInfo(bidResponse.id, await getAuthData(adminId));
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
      await expect(page.locator(`[data-externalid="${bidResponse.id}"]`)).toHaveText(`${externalId}`);
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
      await expect(page.locator(`[data-averageplanweight="${bidResponse.id}"]`)).toHaveText('10,00');
      await expect(page.locator(`[data-output="${bidResponse.id}"]`)).toHaveText(
        (bidInfo.price / Math.ceil(bidInfoResponse.planMileage / 1000)).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-numberofdays="${bidResponse.id}"]`)).toHaveText('4,00'); //после задачи сделали так чтоб только целые числа были
      const profitabilityOfBidSettings: any = await clienApi.GetObjectResponse(
        `${process.env.url}/api/organizationProfile/getProfitabilityOfBidSettings`,
        await getAuthData(adminId)
      );
      const overallMounthInfo: any = await clienApi.GetObjectResponse(
        `${process.env.url}/api/report/getDataQuery/OverallReport/?paramsQuery=$filter=StartedAt gt ${moment().format("YYYY-MM-01")}T00:00:00.000Z and EndedAt lt ${moment().format("YYYY-MM-DD")}T23:59:59.000Z`,
        await getAuthData(adminId)
      );
      carMountKm = overallMounthInfo.data.filter(item => item.carId == bidInfo.carOption.carId)
      console.log(carMountKm)
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
      const finalprofit = bidInfo.price - (fuelcost + profitabilityOfBidSettings.costOfOneDay * 4);
      const finalprofitText: string = await page.innerText(`[data-finalprofit="${bidResponse.id}"]`);
      // Удаляем неразрывные пробелы
      const cleanedStr = finalprofitText.replace(/\u00A0/g, '');
      // Меняем запятую на точку
      const normalizedStr = cleanedStr.replace(',', '.');
      // Преобразуем в число
      const numberValue = parseFloat(normalizedStr);
      const epsilon: number = 20;
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
    await test.step('Проверка 3.Отчет "Средний тоннаж за период"', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator(`[name='Отчет "Средний тоннаж за период"']`).click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('#carIdInput').click();
      await page.locator('#carIdInput').fill(bidInfo.carOption.number);
      await page.getByRole('option', { name: `${bidInfo.carOption.number}` }).click();
      await page.waitForTimeout(5000)
      await page.locator(`[data-car="${bidInfo.carOption.number}"]`).click();
      await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toContainText(`${bidResponse.id}`);
      await expect(page.locator(`[data-externalid="${bidResponse.id}"]`)).toContainText(externalId);
      await expect(page.locator(`[data-driverfullname="${bidResponse.id}"]`)).toContainText(`${bidInfo.driver.shortName}`)
      await expect(page.locator(`[data-plannedtonnage="${bidResponse.id}"]`)).toContainText(bidInfo.cargos[0].weight.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator(`[data-actualtonnage="${bidResponse.id}"]`)).toContainText('0,00')
    })
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
    await test.step('Проверка 5.Отчет "Отчет план-факт', async () => {
      filterLogist = await clienApi.GetObjectResponse(
        `${process.env.url}/api/adminpanel/getAllUsers?$filter=(contains(cast(id, Model.String),'${bidInfo.carOption.carLogistId}') and roles/any(roles:roles ne 'Driver'))&$orderby=id desc&$top=30&$skip=0`,
        await getAuthData(adminId))
      await page.locator('[title="Отчеты"]').click();
      await page.locator(`[name="Отчет план-факт"]`).click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page.locator('[class="book-show__title"]').click();
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('#carLogistIdsInput').click();
      await page.locator('#carLogistIdsInput').fill(filterLogist[0].fullName);
      await page.getByRole('option', { name: `${filterLogist[0].fullName}` }).click();
      await page.waitForTimeout(5000)
      await page.locator('[class="book-show__title"]').click();
      await expect(page.locator("//div[@role='cell']//div[1]")).toContainText(`${filterLogist[0].fullName}`)
      await page.locator("//div[@role='cell']//div[1]").click();
      await page.locator(`[data-car="${bidInfo.carOption.number}"]`).click();
      await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toBeVisible();
      await page.locator('[name="bidId"]').fill(`${bidResponse.id}`)
      await page.waitForTimeout(5000)
      await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toContainText(`${bidResponse.id}`);
      await expect(page.locator('[class="pl-1 icon-uEA83-user-edit b-point__tooltip-icon"]')).toBeVisible(); //знак закрытия вручную
      await expect(page.locator(`//div[normalize-space()='${externalId}']`)).toBeVisible(); //внешний id
      await expect(page.locator(`[data-activemileageplan="${bidResponse.id}"]`)).toContainText(Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator(`[data-activemileagefact="${bidResponse.id}"]`)).toContainText(Math.ceil(bidInfoResponse.activeMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator(`[data-emptymileageplan="${bidResponse.id}"]`)).toContainText('0,00');
      await expect(page.locator(`[data-emptymileagefact="${bidResponse.id}"]`)).toContainText('0,00');
      await expect(page.locator(`[data-overallbidsprice="${bidResponse.id}"]`)).toHaveText(
        bidInfo.price.toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
      await expect(page.locator(`[data-outputplan="${bidResponse.id}"]`)).toHaveText('93,03')
      await expect(page.locator(`[data-outputfact="${bidResponse.id}"]`)).toHaveText(
        (bidInfo.price / Math.ceil(bidInfoResponse.planMileage / 1000)).toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          style: 'decimal', // обычное число, без валюты
          useGrouping: true, // группировка тысяч
        })
      );
    })
    await test.step('Проверка 6.Отчет по водителям', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator(`[name="Отчет по водителям"]`).click();
      await page.locator('input[name="startDate"]').fill(moment().subtract(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page.locator('[class="book-show__title"]').click();
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('#carLogistIdsInput').click();
      await page.locator('#carLogistIdsInput').fill(filterLogist[0].fullName);
      await page.getByRole('option', { name: `${filterLogist[0].fullName}` }).click();
      await page.waitForTimeout(5000)
      await page.locator('[class="book-show__title"]').click();
      await expect(page.locator("//div[@role='cell']//div[1]")).toContainText(`${filterLogist[0].fullName}`)
      await page.locator("//div[@role='cell']//div[1]").click();
      await page.locator(`[data-car="${bidInfo.carOption.number}"]`).click();
      await expect(page.locator(`[data-bidid="${bidResponse.id}"]`)).toBeVisible();
      await page.locator('[name="bids"]').fill(`${bidResponse.id}`)
      await page.waitForTimeout(5000)
      await expect(page.locator('[class="pl-1 icon-uEA83-user-edit b-point__tooltip-icon"]')).toBeVisible(); //знак закрытия вручную
      await expect(page.locator(`//div[normalize-space()='${externalId}']`)).toBeVisible(); //внешний id
      await expect(page.locator(`[data-car="${bidInfo.carOption.number}"]`)).toHaveText(`${bidInfo.carOption.number}`)
      await expect(page.locator(`[data-planmileage="${bidInfo.carOption.number}"]`)).toContainText(Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator(`[data-factmileage="${bidInfo.carOption.number}"]`)).toContainText(Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator(`[data-timedeviation="${bidInfo.carOption.number}"]`)).toHaveText('0м')
      await expect(page.locator(`[data-timedeviation="${bidInfo.carOption.number}"]`)).toHaveText('0м')
      await expect(page.locator(`[data-dayaveragemileage="${bidInfo.carOption.number}"]`)).toContainText(Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
    })
    await test.step('Проверка 8.Отчет по ежедневным пробегам ТС', async () => {
      await page.locator('[title="Отчеты"]').click();
      await page.locator(`[name="Отчет по ежедневным пробегам ТС"]`).click();
      await page.locator('input[name="startDate"]').fill(moment().format('DD.MM.YYYY HH:mm'));
      await page.locator('input[name="endDate"]').fill(moment().add(1, 'd').format('DD.MM.YYYY HH:mm'));
      await page.locator('[class="book-show__title"]').click();
      await page
        .locator("//div[@class='report__filters--left']//a[@class='btn btn-sm btn-brand'][contains(text(),'Обновить')]")
        .click();
      await page.locator('[name="ТС"]').fill(`${bidInfo.carOption.number}`)
      await expect(page.locator('[data-brandtype')).toHaveText(`Проверочная модель машины`) //TODo доделать на нормальную проверку пока так
      await expect(page.locator('[data-logists]')).toHaveText(`${filterLogist[0].fullName}`)
      await expect(page.locator('[data-overallmileage]')).toContainText(Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator(`[data-${moment().format("DD.MM.YYYY")}]`)).toContainText(Math.ceil(bidInfoResponse.planMileage / 1000).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
    })
    await test.step('Проверка данных в Планировании по машинам', async () => {
      await page.locator("//span[contains(text(),'Планирование')]").click();
      await page.locator("//a[@title='По машинам']").click();
      await page.waitForTimeout(5000)
      await page.locator("//div[@class='b-filter__collapse-btn b-filter__collapse-btn--bottom']").first().click();
      await page.locator('#carIdContainer').click();
      await page.locator('#carIdContainer').first().type(bidInfo.carOption.number, { delay: 100 });
      await page.waitForTimeout(1500);
      await page.locator(`text=${bidInfo.carOption.number}`).nth(1).click();
      await page.waitForTimeout(1500);
      await page.waitForSelector('[class="carnumber__number"]', {
        state: 'visible',
        timeout: 30000
      })
      const carNumberText = await page.locator('div[class="carnumber__number"]').first().textContent();
      const carRegionText = await page.locator('div[class="carnumber__region"]').first().textContent();
      const fullCarNumber = `${carNumberText}/${carRegionText}`;
      console.log(fullCarNumber);
      if (fullCarNumber.replace(/\s+/g, '') != bidInfo.carOption.number.replace(/\s+/g, '')) {
        throw new Error(
          `ожидаемый номер машины по тексту не совпадает${fullCarNumber.replace(/\s+/g, '')} и ${bidInfo.carOption.number.replace(/\s+/g, '')}`
        );
      }
      // const trailerNumberText = await page.locator('div[class="carnumber__number"]').nth(1).textContent();
      // const trailerRegionText = await page.locator('div[class="carnumber__region"]').nth(1).textContent();
      // const fullTrailerNumber = `${trailerNumberText}/${trailerRegionText}`;
      // console.log(fullTrailerNumber);
      // if (fullTrailerNumber.replace(/\s+/g, '') != bidInfo.trailerOption.number.replace(/\s+/g, '')) {
      //   throw new Error(
      //     `ожидаемый номер машины по тексту не совпадает${fullTrailerNumber.replace(/\s+/g, '')} и ${bidInfo.trailerOption.number.replace(/\s+/g, '')}`
      //   );
      // }
      console.log(carMountKm)
      await expect(page.locator('[class="badge badge-pill badge-secondary mr-2"]')).toContainText(carMountKm[0].overallMileage.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      await expect(page.locator('[class="badge badge-pill badge-secondary"]')).toContainText(carMountKm[0].output.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        style: 'decimal', // обычное число, без валюты
        useGrouping: true, // группировка тысяч
      }))
      // await page.waitForTimeout(60000);
    })
  });
});

test.beforeAll(async () => {
  await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
test.afterAll(async () => {
  await clienApi.deleteUsedCar(bidInfo.carOption.carId)
});
