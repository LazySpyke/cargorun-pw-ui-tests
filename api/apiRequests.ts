// api/apiRequests.ts
import { request, APIRequestContext } from '@playwright/test';

class APIRequests {
  private context: APIRequestContext | null = null;

  async init(): Promise<void> {
    this.context = await request.newContext();
  }
  async authorize(endpoint: string, credentials: any): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }

    const response = await this.context.post(endpoint, {
      data: credentials,
    });

    const jsonResponse = await response.json();
    return jsonResponse;
  }

  async getData(endpoint: string, authHeaders: string) {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }

    const response = await this.context.get(endpoint, {
      headers: {
        Authorization: await authHeaders,
      },
    });
    return await response.json();
  }
  async close(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
    }
  }

  async postData(endpoint: string, body: any, authHeaders: string) {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }

    const response = await this.context.post(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: await authHeaders,
      },
      data: body
    });
    return await response.json();
  }
}

export default APIRequests;
