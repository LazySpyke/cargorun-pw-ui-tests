import { Page } from "@playwright/test";
var pointIndex:number = 0
export class BidPage {
    private page: Page;
    private responsibleSelectList = '#responsibleIdContainer';
    private salesManagerSelectList = '#salesManagerIdContainer';
    private legalPersonSelectList = '#legalPersonIdContainer';
    private isEmptyFlag = 'div[name="isEmptyMileageBid"]';
    private isInternationalFlag = 'div[name="isInternational"]';
    private cargoOwnerSelectList ='#cargoOwnerDictionaryItemIdContainer';
    private contactNumberInput = 'input[name="contractNumber"]';
    private documentSelectList = 'div[id="documentContainer"]';
    private temperatureMinimumInput = 'div[name="temperatureMinimum"]';
    private temperatureMaximumInput = 'div[name="temperatureMaximum"]';
    private createDocumentAssignmentFlag = '[name="createDocumentAssignment"]';
    private showDraftInPlanningFlag = '[name="showDraftInPlanning"]';
    private isExpressBidFlag = 'div[name="isExpressBid"';
    private paymentTypeSelectList = 'div[id="paymentTypeIdContainer"]';
    private ndsTypeSelectList = "#ndsTypeIdContainer";
    private paymentPeriodSelectList = '#paymentPeriodTypeContainer';
    private paymentPeriodInDaysInput = 'input[name="paymentPeriodInDays"]';
    private priceInput = 'input[name="price"]';
    private isVatTopFlag = 'div[name="isVatTop"]';
    private driverSelectList = '#driverContainer';
    private carSelectList = '#carOptionContainer';
    private trailerSelectList = '#trailerOptionContainer';
    private cargoName = 'input[name="name"]';
    private cargoType = '#typeIdContainer';
    private packTypeInput = '[name="packType"]';
    private commentTextArea = 'textarea[class="field-wrap__input field-wrap__input--textarea"]';
    private cargoWeight = 'input[name="weight"]';
    private cargoValume = 'input[name="volume"]';
    private cargoLength = 'input[name="length"]';
    private cargoWidth = 'input[name="width"]';
    private cargoHeight = 'input[name="height"]';
    private pointCargoOwner = `#cargoOwnerDictionaryItemIdContainer_${pointIndex}`; //после _ index точки начиная с 0
    private pointGeozone = `input[name="pointElemGeozone_${pointIndex}"]`;
    private pointGeozoneRadius = `input[name="radius_${pointIndex}"]`;
    private pointPlanEnterDate = `input[name="planEnterDate_${pointIndex}"]`;
    private pointDateDiapazoneFlag = `(//DIV[@class='d-inline-block checkbox__text'][text()='Диапазон дат'])${pointIndex + 1}` //добавляем +1 так как ссылаемся по тексту
    private pointSecondDate = `input[name="secondaryPlanEnterDate_${pointIndex}"]`;
    private pointLeaveDateFlag = `(//DIV[@class='d-inline-block checkbox__text'][text()='Изменить плановую дату выезда'])[${pointIndex + 1}]`;
    private pointLeaveDateInput = `input[name="planLeaveDate_${pointIndex}"]`;
    private loadOptionsSelectList = `#loadOptionsContainer_${pointIndex}`;
    private pointPhoneNumber = `input[name="phoneNumber_${pointIndex}"]`;
    private pointContactNameInput = `input[name="name_${pointIndex}"]`;
    private saveBidButton = 'input[value="Сохранить как черновик"]';
    
  constructor(page: Page) {
      this.page = page;
  }

  async goto() {
    await this.page.goto("/login"); // Перейти на страницу логина
  }

  async Create() {
      await page.locator(".css-klbavo-control").first().click();
      await page
        .getByRole("option", { name: "Кузьмина Антонида Веселов" })
        .click();
      await page.locator(".css-klbavo-control").first().click();
      await page
        .getByRole("option", { name: "Прохоров Anita Дементьева" })
        .click();
      await page
        .locator("#cargoOwnerDictionaryItemIdContainer > .css-klbavo-control")
        .click();
      await page
        .getByRole("option", { name: "groupwareКлатч ((916)606-47-" })
        .click();
      await page.locator('input[name="contractNumber"]').click();
      await page.locator('input[name="contractNumber"]').fill("номер договора");
      await page
        .locator("#documentContainer div")
        .filter({ hasText: "Добавить документ" })
        .first()
        .click();
      await page.getByRole("option", { name: "Frozen" }).click();
      await page.locator('input[name="temperatureMinimum"]').first().click();
      await page.locator('input[name="temperatureMinimum"]').first().fill("1");
      await page
        .locator("div")
        .filter({
          hasText: /^Максимальный температурный режим, ℃ Обязательное поле$/,
        })
        .getByRole("spinbutton")
        .click();
      await page
        .locator("div")
        .filter({
          hasText: /^Максимальный температурный режим, ℃ Обязательное поле$/,
        })
        .getByRole("spinbutton")
        .fill("11");
      await page
        .locator("div")
        .filter({ hasText: /^Создать водителю задачу по сдаче документов$/ })
        .locator("span")
        .click();
      await page
        .locator("div")
        .filter({ hasText: /^Отображать черновик в планировании$/ })
        .locator("span")
        .click();
      await page
        .locator("div")
        .filter({ hasText: /^Экспресс-заявка$/ })
        .locator("span")
        .click();
      await page.locator('input[name="averageSpeed"]').click();
      await page.locator('input[name="averageSpeed"]').fill("90");
      await page.locator('input[name="dayStart"]').click();
      await page.locator('input[name="dayStart"]').fill("08:00");
      await page.locator('input[name="workHours"]').click();
      await page.locator('input[name="workHours"]').fill("10");
      await page
        .locator("#paymentTypeIdContainer > .css-klbavo-control")
        .click();
      await page.getByRole("option", { name: "Безналичный" }).click();
      await page.locator("#ndsTypeIdContainer > .css-klbavo-control").click();
      await page.getByRole("option", { name: "Без НДС" }).click();
      await page
        .locator("#paymentPeriodTypeContainer > .css-klbavo-control")
        .click();
      await page.getByRole("option", { name: "В календарных днях" }).click();
      await page.locator('input[name="paymentPeriodInDays"]').click();
      await page.locator('input[name="paymentPeriodInDays"]').fill("90");
      await page.locator('input[name="price"]').click();
      await page.locator('input[name="price"]').fill("100000");
      await page.locator("#driverContainer > .css-klbavo-control").click();
      await page
        .getByRole("option", { name: "Воронцов Альберт Силина" })
        .click();
      await page.locator("#carOptionContainer > .css-klbavo-control").click();
      await page.getByRole("option", { name: "С369КО/" }).click();
      await page
        .locator("#trailerOptionContainer > .css-klbavo-control")
        .click();
      await page.getByRole("option", { name: "МТ2533/" }).click();
      await page.locator('input[name="name"]').click();
      await page.locator('input[name="name"]').fill("test gruz");
      await page.locator("#typeIdContainer > .css-klbavo-control").click();
      await page.getByRole("option", { name: "Другое" }).click();
      await page.locator('input[name="packType"]').click();
      await page.locator('input[name="packType"]').fill("упаковка");
      await page.locator('textarea[name="comment"]').click();
      await page
        .locator('textarea[name="comment"]')
        .fill("комментарий к грузу");
      await page.locator('input[name="weight"]').click();
      await page.locator('input[name="weight"]').fill("10");
      await page.locator('input[name="weight"]').press("Tab");
      await page.locator('input[name="volume"]').fill("15");
      await page.locator('input[name="volume"]').press("Tab");
      await page.locator('input[name="length"]').fill("20");
      await page.locator('input[name="length"]').press("Tab");
      await page.locator('input[name="width"]').fill("30");
      await page.locator('input[name="width"]').press("Tab");
      await page.locator('input[name="height"]').fill("40");
      await page
        .getByText(
          "Общие параметрыОтветственныйКузьмина Антонида ВеселовМенеджер по продажамПрохоро"
        )
        .click();
      await page.getByPlaceholder("От").click();
      await page.getByPlaceholder("От").fill("1");
      await page.getByPlaceholder("До").click();
      await page.getByPlaceholder("До").fill("2");
      await page
        .locator(
          "div:nth-child(2) > .col-sm-8 > #typeOptionsContainer_1 > .css-klbavo-control > .css-afaz1b > .css-tl8mrc"
        )
        .click();
      await page
        .locator("#cargoOwnerDictionaryItemIdContainer_0 > .css-klbavo-control")
        .click();
      await page.getByRole("option", { name: "(123123123312)" }).click();
      await page.locator('input[name="pointElemGeozone_0"]').click();
      await page
        .getByRole("textbox", {
          name: "Начните вводить адрес или нажмите на карту",
        })
        .fill("Набережные Челны");
      await page
        .getByText("Россия, Республика Татарстан, Набережные Челны", {
          exact: true,
        })
        .click();
      await page.getByText("Подтвердить точку").click();
      await page.locator('input[name="planEnterDate_0"]').click();
      await page
        .locator('input[name="planEnterDate_0"]')
        .fill("10.03.2025 00:007");
      await page
        .getByText(
          "Общие параметрыОтветственныйКузьмина Антонида ВеселовМенеджер по продажамПрохоро"
        )
        .click();
      await page
        .locator("#loadOptionsContainer_0 > .css-klbavo-control")
        .click();
      await page
        .locator("#react-select-loadOptionsInstance_0-option-0")
        .click();
      await page
        .locator("div")
        .filter({ hasText: /^Верхняя1$/ })
        .first()
        .click();
      await page.getByRole("option", { name: "Боковая" }).click();
      await page
        .locator("#scenarioIdContainer_0 > .css-klbavo-control")
        .click();
      await page.getByRole("option", { name: "Новый сценарий" }).click();
      await page.locator('textarea[name="comment_0"]').click();
      await page.locator('textarea[name="comment_0"]').fill("comment");
      await page.locator('input[name="phoneNumber_0"]').click();
      await page.locator('input[name="phoneNumber_0"]').fill("+79963557879");
      await page.locator('input[name="name_0"]').click();
      await page.locator('input[name="name_0"]').fill("KontaktName");
    });
}