import { request, APIRequestContext } from '@playwright/test';
class DebugAPIRequestsClient {
    private context: APIRequestContext | null = null;

    async init(): Promise<void> {
        this.context = await request.newContext();
    }

    async runTask(name: string, bearerToken: string): Promise<any> {
        if (!this.context) {
            throw new Error('APIRequestContext is not initialized. Call init() first.');
        }
        const response = await this.context.post(`${process.env.url}/api/dev/task/run`, {
            data: { name: name },
            headers: {
                'Content-Type': 'application/json',
                Authorization: bearerToken,
                // другие заголовки, если нужны
            },
        });
        console.log(response.status);
    }
}

export default DebugAPIRequestsClient;
