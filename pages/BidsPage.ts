import { Page } from "@playwright/test";
export class BidPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/bids");
    await this.page
      .locator("//DIV[@class='btn btn-brand btn-sm'][text()='Создать заявку']")
      .first()
      .click();
  }

  async SetPaymentInfo(
    price: string,
    isVatTop: boolean,
    paymentType?: string,
    ndsType?: string,
    paymentPeriodType?: string,
    paymentPeriodInDays?: string
  ) {
    await this.page.locator("#paymentTypeIdContainer").click();
    await this.page.locator(`text=${paymentType}`).first().click();
    await this.page.locator("#ndsTypeIdContainer").click();
    await this.page.locator(`text=${ndsType}`).click();
    await this.page.locator("#paymentPeriodTypeContainer").click();
    await this.page.locator(`text=${paymentPeriodType}`).click();
    await this.page
      .locator('input[name="paymentPeriodInDays"]')
      .fill(paymentPeriodInDays || "1");
    await this.page.locator('input[name="price"]').fill(price);
    if (isVatTop == true) {
      await this.page.locator('span[name="isVatTop"]').click();
    }
  }

  async SetDeliveryInfo(
    driver: string,
    car: string,
    secondDriver?: string,
    trailer?: string
  ) {
    await this.page.locator("#driverContainer").click();
    await this.page.locator(`text=${driver}`).click();
    if (secondDriver) {
      await this.page
        .locator(`//SMALL[@class='link'][text()='Добавить второго водителя']`)
        .click();
      await this.page.locator(`text=${secondDriver}`).click();
    }
    await this.page.locator("#carOptionContainer").click();
    await this.page.locator("#carOptionContainer").type(car, { delay: 100 });
    await this.page.locator(`text=${car}`).nth(1).click();
    if (trailer) {
      await this.page
        .locator("#trailerOptionContainer")
        .type(trailer, { delay: 100 });
      await this.page.locator(`text=${trailer}`).nth(1).click();
    }
  }

  async SetGeneralParameters(
    responible?: string,
    salesManager?: string,
    legalPerson?: string,
    internationalBid?: boolean,
    cargoOwnerBid?: string,
    cargoOwnerDoc?: string,
    cargoOwnerDocNumber?: string,
    documents?: string[],
    minTemp?: string,
    maxTemp?: string,
    createQRcode?: boolean,
    watchDraftBidInPlanning?: boolean
  ) {
    if (responible) {
      await this.page.locator("#responsibleIdContainer").click();
      await this.page
        .locator("#responsibleIdContainer")
        .type(responible, { delay: 100 });
      await this.page.locator(`text=${responible}`).nth(1).click();
    }

    if (salesManager) {
      await this.page.locator("#salesManagerIdContainer").click();
      await this.page
        .locator("#salesManagerIdContainer")
        .type(salesManager, { delay: 100 });
      await this.page.locator(`text=${salesManager}`).nth(1).click();
    }
    if (legalPerson) {
      await this.page.locator("#legalPersonIdContainer").click();
      await this.page
        .locator("#legalPersonIdContainer")
        .type(legalPerson, { delay: 100 });
      await this.page.locator(`text=${legalPerson}`).nth(1).click();
    }
    if (internationalBid == true) {
      this.page.locator('span[name="isInternational"]').click();
    }
    if (cargoOwnerBid) {
      await this.page.locator("#cargoOwnerDictionaryItemIdContainer").click();
      await this.page
        .locator("#cargoOwnerDictionaryItemIdContainer")
        .type(cargoOwnerBid, { delay: 100 });
      await this.page.locator(`text=${cargoOwnerBid}`).nth(1).click();
    }
    if (cargoOwnerDoc) {
      await this.page.locator("#contractIdContainer").click();
      await this.page
        .locator("#contractIdContainer")
        .type(cargoOwnerDoc, { delay: 100 });
      await this.page.locator(`text=${cargoOwnerDoc}`).nth(1).click();
    }
    if (cargoOwnerDocNumber) {
      await this.page
        .locator('input[name="contractNumber"]')
        .fill(cargoOwnerDocNumber);
    }
    if (documents) {
      documents.forEach((element) => async () => {
        await this.page.locator("#documentContainer").click();
        await this.page
          .locator("#documentContainer")
          .type(element, { delay: 100 });
        await this.page.locator(`text=${element}`).nth(1).click();
      });
      if (minTemp && maxTemp) {
        await this.page
          .locator('input[name="temperatureMinimum"]')
          .fill(minTemp);
        await this.page
          .locator('input[name="temperatureMaximum"]')
          .fill(maxTemp);
      }

      if (createQRcode == true) {
        await this.page
          .locator('span[name="createDocumentAssignment"]')
          .click();
      }

      if (watchDraftBidInPlanning == true) {
        await this.page.locator('span[name="showDraftInPlanning"]').click();
      }
    }
  }

  async ExpressBidSettings(
    averageSpeed: string,
    dayStart: string,
    workHours: string
  ) {
    await this.page.locator('span[name="isExpressBid"]').click();
    await this.page.locator('input[name="averageSpeed"]').fill(averageSpeed);
    await this.page.locator('input[name="dayStart"]').fill(dayStart);
    await this.page.locator('input[name="workHours"]').fill(workHours);
  }

  async SetBidPoint(
    index: number,
    cargoOwnerBidPoint: string,
    address: string,
    radius: string,
    planEnterDate: string,
    secondDate?: string,
    planLeaveDate?: string,
    loadOptions?: string[],
    scenarioName?: string,
    pointComment?: string,
    pointPhoneNumber?: string,
    pointPhoneUser?: string
  ) {
    await this.page
      .locator(`#cargoOwnerDictionaryItemIdContainer_${index}`)
      .click();
    await this.page
      .locator(`#cargoOwnerDictionaryItemIdContainer_${index}`)
      .type(cargoOwnerBidPoint, { delay: 100 });
    await this.page.locator(`text=${cargoOwnerBidPoint}`).nth(1).click();

    await this.page.locator(`[name="pointElemGeozone_${index}"]`).click();
    await this.page
      .locator('input[class="map__picker-field map__picker-field--desktop"]')
      .fill(address);
    await this.page.locator('div[class="map__result-item"]').first().click();
    await this.page.locator(
      "//DIV[@class='leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive']"
    );
    await this.page
      .locator(
        "//DIV[@class='btn btn-brand map__submit-btn'][text()='Подтвердить точку']"
      )
      .click();
    await this.page.locator(`input[name="radius_${index}"]`).fill(radius);
    await this.page
      .locator(`input[name="planEnterDate_${index}"]`)
      .fill(planEnterDate);
    if (secondDate) {
      await this.page
        .locator(
          `(//DIV[@class='d-inline-block checkbox__text'][text()='Диапазон дат'])[${
            index + 1
          }]`
        )
        .click();
      await this.page
        .locator(`//INPUT[@name='secondaryPlanEnterDate_${index}']`)
        .fill(secondDate);
    }
    if (planLeaveDate) {
      await this.page
        .locator(
          `(//DIV[@class='d-inline-block checkbox__text'][text()='Изменить плановую дату выезда'])[${
            index + 1
          }]`
        )
        .click();
      await this.page
        .locator(`//INPUT[@name='planLeaveDate_${index}']`)
        .fill(planLeaveDate);
    }

    if (loadOptions) {
      loadOptions.forEach((element) => async () => {
        await this.page.locator(`#loadOptionsContainer_${index}`).click();
        await this.page
          .locator(`#loadOptionsContainer_${index}`)
          .type(element, { delay: 100 });
        await this.page.locator(`text=${element}`).nth(1).click();
      });

      if (scenarioName) {
        await this.page.locator(`#scenarioIdContainer_${index}`).click();
        await this.page
          .locator(`#scenarioIdContainer_${index}`)
          .type(scenarioName, { delay: 100 });
        await this.page.locator(`text=${scenarioName}`).nth(1).click();
      }
      if (pointComment) {
        await this.page
          .locator(`textarea[name="comment_${index}"]`)
          .fill(pointComment);
      }

      if (pointPhoneNumber && pointPhoneUser) {
        await this.page
          .locator(`input[name="phoneNumber_${index}"]`)
          .fill(pointPhoneNumber);
        await this.page
          .locator(`input[name="name_${index}"]`)
          .fill(pointPhoneUser);
      }
    }
  }

  async CreateCommonBid(carNumber) {
    await this.SetPaymentInfo(
      "100000",
      false,
      "Безналичный",
      "10%",
      "В календарных днях",
      "90"
    );
    await this.SetDeliveryInfo("Иванович", carNumber);
    await this.SetGeneralParameters("Беспалов", "Шаров");
    await this.ExpressBidSettings("100", "00:00", "24");
    await this.SetBidPoint(
      0,
      "withdrawalКалиниградская",
      "Набережные Челны",
      "200",
      "15.03.2025 21:10",
      "19.03.2025 22:10",
      "20.03.2025 22:10"
    );
    await this.SetBidPoint(
      1,
      "withdrawalКалиниградская",
      "Елабуга",
      "500",
      "23.03.2025 21:10",
      "24.03.2025 22:10",
      "25.03.2025 22:10"
    );
    await this.page.locator("//INPUT[@type='submit']").click();
    await this.page
      .locator("//DIV[@class='message'][text()='Ваш запрос выполнен успешно.']")
      .isVisible();
    await this.page
      .locator("//SPAN[@class='badge badge-light'][text()='Черновик']")
      .isVisible();
  }
}
