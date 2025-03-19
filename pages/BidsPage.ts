import { Page } from "@playwright/test";
export class BidPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/bids"); // Перейти на страницу логина
    await this.page.locator("//DIV[@class='btn btn-brand btn-sm'][text()='Создать заявку']").first().click();
  }

  async SetPaymentInfo(price: string, isVatTop: boolean, paymentType?: string, ndsType?: string, paymentPeriodType?: string, paymentPeriodInDays?: string) {
    await this.page.locator('#paymentTypeIdContainer').click();
    await this.page.locator(`text=${paymentType}`).first().click();
    await this.page.locator('#ndsTypeIdContainer').click()
    await this.page.locator(`text=${ndsType}`).click();
    await this.page.locator('#paymentPeriodTypeContainer').click();
    await this.page.locator(`text=${paymentPeriodType}`).click();
    await this.page.locator('input[name="paymentPeriodInDays"]').fill(paymentPeriodInDays || "1");
    await this.page.locator('input[name="price"]').fill(price)
    if (isVatTop == true) {
      await this.page.locator('span[name="isVatTop"]').click();
    }
  }

  async SetDeliveryInfo(driver: string, car: string, secondDriver?: string, trailer?: string) {
    await this.page.locator('#driverContainer').click();
    await this.page.locator(`text=${driver}`).click();
    if (secondDriver != undefined) {
      await this.page.locator(`//SMALL[@class='link'][text()='Добавить второго водителя']`).click();
      await this.page.locator(`text=${secondDriver}`).click();
    }
    await this.page.locator('#carOptionContainer').click();
    await this.page.locator('#carOptionContainer').type(car, { delay: 100 });
    await this.page.locator(`text=${car}`).nth(1).click();
    if (trailer != undefined) {
      await this.page.locator('#trailerOptionContainer').type(trailer, { delay: 100 });
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
    const fillInput = async (selector: string, value: string) => {
      await this.page.locator(selector).click();
      await this.page.locator(selector).type(value, { delay: 100 });
      await this.page.locator(`text=${value}`).nth(1).click();
    };

    const actions: Promise<void>[] = [];

    if (responible) actions.push(fillInput('#responsibleIdContainer', responible));
    if (salesManager) actions.push(fillInput('#salesManagerIdContainer', salesManager));
    if (legalPerson) actions.push(fillInput('#legalPersonIdContainer', legalPerson));
    if (internationalBid) actions.push(this.page.locator('span[name="isInternational"]').click());
    if (cargoOwnerBid) actions.push(fillInput('#cargoOwnerDictionaryItemIdContainer', cargoOwnerBid));
    if (cargoOwnerDoc) actions.push(fillInput('#contractIdContainer', cargoOwnerDoc));
    if (cargoOwnerDocNumber) actions.push(this.page.locator('input[name="contractNumber"]').fill(cargoOwnerDocNumber));

    if (documents) {
      for (const element of documents) {
        actions.push(fillInput('#documentContainer', element));
      }
    }

    if (minTemp && maxTemp) {
      actions.push(this.page.locator('input[name="temperatureMinimum"]').fill(minTemp));
      actions.push(this.page.locator('input[name="temperatureMaximum"]').fill(maxTemp));
    }

    if (createQRcode) actions.push(this.page.locator('span[name="createDocumentAssignment"]').click());
    if (watchDraftBidInPlanning) actions.push(this.page.locator('span[name="showDraftInPlanning"]').click());

    // Выполняем все действия параллельно
    await Promise.all(actions);
  }

  async ExpressBidSettings(averageSpeed: string, dayStart: string, workHours: string) {
    await this.page.locator('span[name="isExpressBid"]').click();
    await this.page.locator('input[name="averageSpeed"]').fill(averageSpeed);
    await this.page.locator('input[name="dayStart"]').fill(dayStart);
    await this.page.locator('input[name="workHours"]').fill(workHours);
  }

  async SetBidPoint(index: number, cargoOwnerBidPoint: string, address: string, radius: string, planEnterDate: string, secondDate?: string, planLeaveDate?: string, loadOptions?: string[], scenarioName?: string, pointComment?: string, pointPhoneNumber?: string, pointPhoneUser?: string) {
    await this.page.locator(`#cargoOwnerDictionaryItemIdContainer_${index}`).click();
    await this.page.locator(`#cargoOwnerDictionaryItemIdContainer_${index}`).type(cargoOwnerBidPoint, { delay: 100 });
    await this.page.locator(`text=${cargoOwnerBidPoint}`).nth(1).click();

    await this.page.locator(`[name="pointElemGeozone_${index}"]`).click();
    await this.page.locator('input[class="map__picker-field map__picker-field--desktop"]').fill(address);
    await this.page.locator('div[class="map__result-item"]').first().click();
    await this.page.locator("//DIV[@class='leaflet-marker-icon map__icon map-icon map-icon--green-marker leaflet-zoom-animated leaflet-interactive']")
    await this.page.locator("//DIV[@class='btn btn-brand map__submit-btn'][text()='Подтвердить точку']").click();
    await this.page.locator(`input[name="radius_${index}"]`).fill(radius);
    await this.page.locator(`input[name="planEnterDate_${index}"]`).fill(planEnterDate);
    if (secondDate != undefined) {
      await this.page.locator(`(//DIV[@class='d-inline-block checkbox__text'][text()='Диапазон дат'])[${index + 1}]`).click();
      await this.page.locator(`//INPUT[@name='secondaryPlanEnterDate_${index}']`).fill(secondDate)
    }
    if (planLeaveDate != undefined) {
      await this.page.locator(`(//DIV[@class='d-inline-block checkbox__text'][text()='Изменить плановую дату выезда'])[${index + 1}]`).click();
      await this.page.locator(`//INPUT[@name='planLeaveDate_${index}']`).fill(planLeaveDate);
    }

    if (loadOptions != undefined) {
      loadOptions.forEach(element => async () => {
        await this.page.locator(`#loadOptionsContainer_${index}`).click();
        await this.page.locator(`#loadOptionsContainer_${index}`).type(element, { delay: 100 });
        await this.page.locator(`text=${element}`).nth(1).click();
      });

      if (scenarioName != undefined) {
        await this.page.locator(`#scenarioIdContainer_${index}`).click();
        await this.page.locator(`#scenarioIdContainer_${index}`).type(scenarioName, { delay: 100 });
        await this.page.locator(`text=${scenarioName}`).nth(1).click();
      }
      if (pointComment != undefined) {
        await this.page.locator(`textarea[name="comment_${index}"]`).fill(pointComment);
      }

      if (pointPhoneNumber != undefined && pointPhoneUser != undefined) {
        await this.page.locator(`input[name="phoneNumber_${index}"]`).fill(pointPhoneNumber);
        await this.page.locator(`input[name="name_${index}"]`).fill(pointPhoneUser);
      }
    }
  }


  async CreateCommonBid(carNumber) {
    await this.SetPaymentInfo("100000", false, "Безналичный", "10%", "В календарных днях", "90");
    await this.SetDeliveryInfo("Иванович", carNumber)
    await this.SetGeneralParameters("Беспалов", "Шаров")
    await this.ExpressBidSettings("100", "00:00", "24");
    await this.SetBidPoint(0, "withdrawalКалиниградская", "Набережные Челны", "200", "15.03.2025 21:10", "19.03.2025 22:10", "20.03.2025 22:10");
    await this.SetBidPoint(1, "withdrawalКалиниградская", "Елабуга", "500", "23.03.2025 21:10", "24.03.2025 22:10", "25.03.2025 22:10");
    await this.page.locator("//INPUT[@type='submit']").click();
    await this.page.locator("//DIV[@class='message'][text()='Ваш запрос выполнен успешно.']").isVisible();
    await this.page.locator("//SPAN[@class='badge badge-light'][text()='Черновик']").isVisible();
  }
}
