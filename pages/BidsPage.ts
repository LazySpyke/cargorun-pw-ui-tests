import { Page, expect } from '@playwright/test';
import { gerateBidCreateInfo } from '../pages/Fixtures';
export class BidPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/bids');
    await this.page.locator("//DIV[@class='btn btn-brand btn-sm'][text()='Создать заявку']").first().click();
  }

  async gotoDistribution() {
    await this.page.goto('/distribution-bids/list');
    await this.page.locator("//DIV[@class='btn btn-brand btn-sm'][text()='Создать заказ']").first().click();
  }

  async SetPaymentInfo({
    price,
    isVatTop,
    paymentType,
    ndsType,
    paymentPeriodType,
    paymentPeriodInDays,
  }: {
    price: string;
    isVatTop: boolean;
    paymentType?: string;
    ndsType?: string;
    paymentPeriodType?: string;
    paymentPeriodInDays?: string;
  }) {
    await this.page.locator('#paymentTypeIdContainer').click();
    await this.page.locator(`text=${paymentType}`).first().click();
    await this.page.locator('#ndsTypeIdContainer').click();
    await this.page.locator(`text=${ndsType}`).click();
    await this.page.locator('#paymentPeriodTypeContainer').click();
    await this.page.locator(`text=${paymentPeriodType}`).click();
    await this.page.locator('input[name="paymentPeriodInDays"]').fill(paymentPeriodInDays || '1');
    await this.page.locator('input[name="price"]').fill(price);
    if (isVatTop == true) {
      await this.page.locator('span[name="isVatTop"]').click();
    }
  }

  async SetDeliveryInfo({
    driver,
    car,
    secondDriver,
    trailer,
  }: {
    driver: string;
    car: string;
    secondDriver?: string;
    trailer?: string;
  }) {
    await this.page.locator('#driverContainer').click();
    await this.page.locator('#driverContainer').type(driver, { delay: 100 });
    await this.page.locator(`text=${driver}`).nth(1).click();
    if (secondDriver) {
      await this.page.locator(`//SMALL[@class='link'][text()='Добавить второго водителя']`).click();
      await this.page.locator(`text=${secondDriver}`).click();
    }
    await this.page.locator('#carOptionContainer').click();
    await this.page.locator('#carOptionContainer').type(car, { delay: 100 });
    await this.page.locator(`text=${car}`).nth(1).click();
    if (trailer) {
      await this.page.locator('#trailerOptionContainer').click();
      await this.page.locator('#trailerOptionContainer').type(trailer, { delay: 100 });
      await this.page.locator(`text=${trailer}`).nth(1).click();
    }
  }

  async SetGeneralParameters({
    responible,
    salesManager,
    legalPerson,
    internationalBid,
    cargoOwnerBid,
    cargoOwnerDoc,
    cargoOwnerDocNumber,
    documents,
    minTemp,
    maxTemp,
    createQRcode,
    watchDraftBidInPlanning,
  }: {
    responible?: string;
    salesManager?: string;
    legalPerson?: string;
    internationalBid?: boolean;
    cargoOwnerBid?: string;
    cargoOwnerDoc?: string;
    cargoOwnerDocNumber?: string;
    documents?: string[];
    minTemp?: string;
    maxTemp?: string;
    createQRcode?: boolean;
    watchDraftBidInPlanning?: boolean;
  }) {
    if (responible) {
      await this.page.locator('#responsibleIdContainer').click();
      await this.page.locator('#responsibleIdContainer').type(responible, { delay: 100 });
      await this.page.locator(`text=${responible}`).nth(1).click();
    }

    if (salesManager) {
      await this.page.locator('#salesManagerIdContainer').click();
      await this.page.locator('#salesManagerIdContainer').type(salesManager, { delay: 100 });
      await this.page.locator(`text=${salesManager}`).nth(1).click();
    }
    if (legalPerson) {
      await this.page.locator('#legalPersonIdContainer').click();
      await this.page.locator('#legalPersonIdContainer').type(legalPerson, { delay: 100 });
      await this.page.locator(`text=${legalPerson}`).nth(1).click();
    }
    if (internationalBid == true) {
      this.page.locator('span[name="isInternational"]').click();
    }
    if (cargoOwnerBid) {
      await this.page.locator('#cargoOwnerDictionaryItemIdContainer').click();
      await this.page.locator('#cargoOwnerDictionaryItemIdContainer').type(cargoOwnerBid, { delay: 100 });
      await this.page.locator(`text=${cargoOwnerBid}`).nth(1).click();
    }
    if (cargoOwnerDoc) {
      await this.page.locator('#contractIdContainer').click();
      await this.page.locator('#contractIdContainer').type(cargoOwnerDoc, { delay: 100 });
      await this.page.locator(`text=${cargoOwnerDoc}`).nth(1).click();
    }
    if (cargoOwnerDocNumber) {
      await this.page.locator('input[name="contractNumber"]').fill(cargoOwnerDocNumber);
    }
    if (documents) {
      documents.forEach((element) => async () => {
        await this.page.locator('#documentContainer').click();
        await this.page.locator('#documentContainer').type(element, { delay: 100 });
        await this.page.locator(`text=${element}`).nth(1).click();
      });
      if (minTemp && maxTemp) {
        await this.page.locator('input[name="temperatureMinimum"]').fill(minTemp);
        await this.page.locator('input[name="temperatureMaximum"]').fill(maxTemp);
      }

      if (createQRcode == true) {
        await this.page.locator('span[name="createDocumentAssignment"]').click();
      }

      if (watchDraftBidInPlanning == true) {
        await this.page.locator('span[name="showDraftInPlanning"]').click();
      }
    }
  }

  async ExpressBidSettings({
    averageSpeed,
    dayStart,
    workHours,
  }: {
    averageSpeed: string;
    dayStart: string;
    workHours: string;
  }) {
    await this.page.locator('span[name="isExpressBid"]').click();
    await this.page.locator('input[name="averageSpeed"]').fill(averageSpeed);
    await this.page.locator('input[name="dayStart"]').fill(dayStart);
    await this.page.locator('input[name="workHours"]').fill(workHours);
  }

  async SetBidPoint({
    index,
    cargoOwnerBidPoint,
    address,
    radius,
    planEnterDate,
    secondDate,
    planLeaveDate,
    loadOptions,
    scenarioName,
    pointComment,
    pointPhoneNumber,
    pointPhoneUser,
    isDistribution
  }: {
    index: number;
    cargoOwnerBidPoint?: string;
    address: string;
    radius: string;
    planEnterDate: string;
    secondDate?: string;
    planLeaveDate?: string;
    loadOptions?: string[];
    scenarioName?: string;
    pointComment?: string;
    pointPhoneNumber?: string;
    pointPhoneUser?: string;
    isDistribution?: boolean;
  }) {
    if (cargoOwnerBidPoint != null) {
      if (isDistribution == true) {
        await this.page.locator(`#counterpartyIdContainer_${index}`).click();
        await this.page.locator(`#counterpartyIdContainer_${index}`).type(cargoOwnerBidPoint, { delay: 100 });
        await this.page.locator(`text=${cargoOwnerBidPoint}`).nth(1).click();
      }
      else {
        await this.page.locator(`#cargoOwnerDictionaryItemIdContainer_${index}`).click();
        await this.page.locator(`#cargoOwnerDictionaryItemIdContainer_${index}`).type(cargoOwnerBidPoint, { delay: 100 });
        await this.page.locator(`text=${cargoOwnerBidPoint}`).nth(1).click();
      }
    }
    await this.page.locator(`[name="pointElemGeozone_${index}"]`).click();
    await this.page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill(address);
    await this.page.locator('div[class="map__result-item"]').first().click();
    await this.page.locator(
      "//DIV[@class='leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive']"
    );
    await this.page.locator("//DIV[@class='btn btn-brand map__submit-btn'][text()='Подтвердить точку']").click();
    await this.page.locator(`input[name="radius_${index}"]`).fill(radius);
    await this.page.locator(`input[name="planEnterDate_${index}"]`).fill(planEnterDate);
    if (secondDate) {
      await this.page
        .locator(`(//DIV[@class='d-inline-block checkbox__text'][text()='Диапазон дат'])[${index + 1}]`)
        .click();
      await this.page.locator(`//INPUT[@name='secondaryPlanEnterDate_${index}']`).fill(secondDate);
    }
    if (planLeaveDate) {
      await this.page
        .locator(
          `(//DIV[@class='d-inline-block checkbox__text'][text()='Изменить плановую дату выезда'])[${index + 1}]`
        )
        .click();
      await this.page.locator(`//INPUT[@name='planLeaveDate_${index}']`).fill(planLeaveDate);
    }

    if (loadOptions) {
      loadOptions.forEach((element) => async () => {
        await this.page.locator(`#loadOptionsContainer_${index}`).click();
        await this.page.locator(`#loadOptionsContainer_${index}`).type(element, { delay: 100 });
        await this.page.locator(`text=${element}`).nth(1).click();
      });

      if (scenarioName) {
        await this.page.locator(`#scenarioIdContainer_${index}`).click();
        await this.page.locator(`#scenarioIdContainer_${index}`).type(scenarioName, { delay: 100 });
        await this.page.locator(`text=${scenarioName}`).nth(1).click();
      }
      if (pointComment) {
        await this.page.locator(`textarea[name="comment_${index}"]`).fill(pointComment);
      }

      if (pointPhoneNumber && pointPhoneUser) {
        await this.page.locator(`input[name="phoneNumber_${index}"]`).fill(pointPhoneNumber);
        await this.page.locator(`input[name="name_${index}"]`).fill(pointPhoneUser);
      }
    }
  }

  async CreateCommonBid(CenerateBidInfo: gerateBidCreateInfo) {
    await this.SetPaymentInfo({
      price: '100000',
      isVatTop: false,
      paymentType: 'Безналичный',
      ndsType: '10%',
      paymentPeriodType: 'В календарных днях',
      paymentPeriodInDays: '90',
    });
    await this.SetDeliveryInfo({
      driver: CenerateBidInfo.driver,
      car: CenerateBidInfo.car,
      trailer: CenerateBidInfo.trailer,
    });
    await this.SetGeneralParameters({
      responible: 'Главный Тестовый',
      salesManager: 'Тестовый Логист',
      documents: ['SMTP', 'Forest'],
      legalPerson: CenerateBidInfo.legalPerson,
    });
    await this.ExpressBidSettings({
      averageSpeed: '100',
      dayStart: '00:00',
      workHours: '24',
    });
    await this.SetBidPoint({
      index: 0,
      cargoOwnerBidPoint: CenerateBidInfo.cargoOwnersBid[0].name,
      address: CenerateBidInfo.firstPointCity,
      radius: '200',
      planEnterDate: CenerateBidInfo.firstPointEnterDate,
      secondDate: '',
      planLeaveDate: '',
    });
    await this.SetBidPoint({
      index: 1,
      cargoOwnerBidPoint: CenerateBidInfo.cargoOwnersBid[1].name,
      address: CenerateBidInfo.secondPointCity,
      radius: '500',
      planEnterDate: CenerateBidInfo.secondPointEnterDate,
      secondDate: '',
      planLeaveDate: '',
    });
    await this.page.locator("//INPUT[@type='submit']").click();
    await expect(this.page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
    await this.page.locator("//DIV[@class='book-form__close close close--sm']").click();
    await this.page.locator("//SPAN[@class='badge badge-light'][text()='Черновик']").isVisible({ timeout: 10000 });
    await this.page.locator("//SMALL[@class='pl-1 icon-uEA90-bolt b-point__tooltip-icon']").isVisible();
  }

  async CreateCommonDistributionBid(CenerateBidInfo: gerateBidCreateInfo) {
    await this.SetPaymentInfo({
      price: '100000',
      isVatTop: false,
      paymentType: 'Безналичный',
      ndsType: '10%',
      paymentPeriodType: 'В календарных днях',
      paymentPeriodInDays: '90',
    });
    await this.SetGeneralParameters({
      responible: 'Главный Тестовый',
      documents: ['SMTP', 'Forest'],
      legalPerson: CenerateBidInfo.legalPerson,
    });
    await this.SetBidPoint({
      index: 0,
      cargoOwnerBidPoint: CenerateBidInfo.cargoOwnersBid[0].name,
      address: CenerateBidInfo.firstPointCity,
      radius: '200',
      planEnterDate: CenerateBidInfo.firstPointEnterDate,
      secondDate: '',
      planLeaveDate: '',
      isDistribution: true
    });
    await this.SetBidPoint({
      index: 1,
      cargoOwnerBidPoint: CenerateBidInfo.cargoOwnersBid[1].name,
      address: CenerateBidInfo.secondPointCity,
      radius: '500',
      planEnterDate: CenerateBidInfo.secondPointEnterDate,
      secondDate: '',
      planLeaveDate: '',
      isDistribution: true
    });
    await this.page.locator("//INPUT[@type='submit']").click();
    await expect(this.page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
    await this.page.locator("//SPAN[@class='badge badge-secondary'][text()='Без заявки']").isVisible({ timeout: 10000 });
    await this.page.locator("//SMALL[@class='pl-1 icon-uEA90-bolt b-point__tooltip-icon']").isVisible();
  }
  async CreateEmptyBid(CenerateBidInfo: gerateBidCreateInfo) {
    await this.page.locator('span[name="isEmptyMileageBid"]').click();
    await this.SetDeliveryInfo({
      driver: CenerateBidInfo.driver,
      car: CenerateBidInfo.car,
      trailer: CenerateBidInfo.trailer,
    });
    await this.SetBidPoint({
      index: 0,
      address: CenerateBidInfo.firstPointCity,
      radius: '200',
      planEnterDate: CenerateBidInfo.firstPointEnterDate,
      secondDate: '',
      planLeaveDate: '',
    });
    await this.SetBidPoint({
      index: 1,
      address: CenerateBidInfo.secondPointCity,
      radius: '500',
      planEnterDate: CenerateBidInfo.secondPointEnterDate,
      secondDate: '',
      planLeaveDate: '',
    });
    await this.page.locator("//INPUT[@type='submit']").click();
    await expect(await this.page.getByText('Ваш запрос выполнен успешно')).toBeVisible();
    await this.page.locator("//DIV[@class='book-form__close close close--sm']").click();
    await this.page.locator("//SPAN[@class='badge badge-light'][text()='Черновик']").isVisible({ timeout: 10000 });
    await this.page.locator("//SMALL[@class='pl-1 icon-uEA90-bolt b-point__tooltip-icon']").isVisible();
  }

  async BidFieldReconciliation(CenerateBidInfo: gerateBidCreateInfo, status: string) {
    await this.page.locator('span[class="badge badge-light"]').isVisible({ timeout: 10000 });
    await expect(this.page.locator('span[class="badge badge-light"]')).toHaveText(status);
    if (CenerateBidInfo.isEmpty == true) {
      //так как не заполняются вручную,а подставляются автоматически
      await expect(this.page.getByTestId('price')).toContainText('1,00 ₽ (Безналичный, 20%)');
      // await expect(this.page.getByTestId('paymentPeriod')).toHaveText('90 (В календарных днях)');
    } else {
      await expect(this.page.getByTestId('legal-person')).toHaveText(CenerateBidInfo.legalPerson);
      await expect(this.page.getByTestId('responsible')).toContainText('Главный Т.');
      await expect(this.page.getByTestId('sales-manager')).toContainText('Тестовый Л.');
      await expect(this.page.getByTestId('price')).toContainText('100 000,00 ₽ (Безналичный, 10%)');
      await expect(this.page.getByTestId('paymentPeriod')).toHaveText('90 (В календарных днях)');
    }
    const carNumberText = await this.page.locator('div[class="carnumber__number"]').first().textContent();
    const carRegionText = await this.page.locator('div[class="carnumber__region"]').first().textContent();
    const fullCarNumber = `${carNumberText}/${carRegionText}`;
    console.log(fullCarNumber);
    if (fullCarNumber.replace(/\s+/g, '') != CenerateBidInfo.car.replace(/\s+/g, '')) {
      throw new Error(
        `ожидаемый номер машины по тексту не совпадает${fullCarNumber.replace(/\s+/g, '')} и ${CenerateBidInfo.car.replace(/\s+/g, '')}`
      );
    }
    const trailerNumberText = await this.page.locator('div[class="carnumber__number"]').nth(1).textContent();
    const trailerRegionText = await this.page.locator('div[class="carnumber__region"]').nth(1).textContent();
    const fullTrailerNumber = `${trailerNumberText}/${trailerRegionText}`;
    console.log(fullTrailerNumber);
    if (fullTrailerNumber.replace(/\s+/g, '') != CenerateBidInfo.trailer.replace(/\s+/g, '')) {
      throw new Error(
        `ожидаемый номер машины по тексту не совпадает${fullTrailerNumber.replace(/\s+/g, '')} и ${CenerateBidInfo.trailer.replace(/\s+/g, '')}`
      );
    }
    await expect(this.page.getByTestId('bid-main-driver')).toContainText(CenerateBidInfo.driver);
    ////////////////// точка загрузки
    await expect(this.page.locator('span[class="b-timeline-point__city--name"]').first()).toContainText(
      CenerateBidInfo.firstPointCity
    );
    await expect(this.page.locator('small[class="b-timeline-point__city--timezone"]').first()).toContainText(
      '(+03:00)'
    );
    await expect(this.page.locator('small[class="b-timeline-point__city--type"]').first()).toContainText(
      'Точка загрузки'
    );
    // await expect(this.page.locator('div[class="b-timeline-point__city--full"]').first()).toContainText(
    //   'Россия, Республика Татарстан, Набережные Челны'
    // );
    await this.page.locator('[class="icon-uEA72-chevron-down rotated"]').first().click();
    await expect(this.page.locator('div[data-point-counterparty="0"]')).toContainText(
      CenerateBidInfo.cargoOwnersBid[0].name
    );
    ////////// точка выгрузки
    ////////////////// точка загрузки
    await expect(this.page.locator('span[class="b-timeline-point__city--name"]').nth(1)).toContainText(
      CenerateBidInfo.secondPointCity
    );
    await expect(this.page.locator('small[class="b-timeline-point__city--timezone"]').nth(1)).toContainText('(+03:00)');
    await expect(this.page.locator('small[class="b-timeline-point__city--type"]').nth(1)).toContainText(
      'Точка выгрузки'
    );
    await expect(this.page.locator('div[class="b-timeline-point__city--full"]').nth(4)).toContainText(
      'Россия, Республика Татарстан, Казань'
    );
    await this.page.locator('[class="icon-uEA72-chevron-down rotated"]').nth(0).click();
    await expect(this.page.locator('div[data-point-counterparty="1"]')).toContainText(
      CenerateBidInfo.cargoOwnersBid[1].name
    );
  }
}
