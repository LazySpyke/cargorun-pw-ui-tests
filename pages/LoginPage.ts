import { Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly usernameInputSelector = 'input[type="email"]';
  readonly passwordInputSelector = 'input[type="password"]';
  readonly submitButtonSelector = 'button[type="submit"]';
  readonly errorMessageSelector =
    'div["class="identity-field__error field-validation-error"]';

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/login"); // Перейти на страницу логина
  }

  async login(username: string, password: string) {
    await this.page.fill(this.usernameInputSelector, username);
    await this.page.fill(this.passwordInputSelector, password);
    await this.page.click(this.submitButtonSelector);
  }

  async getErrorMessage() {
    return await this.page.textContent(this.errorMessageSelector);
  }
}
