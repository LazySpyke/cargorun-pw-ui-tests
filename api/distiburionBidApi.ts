import { request, APIRequestContext } from '@playwright/test';
class DistributionAPIRequestsClient {
    private context: APIRequestContext | null = null;

    async init(): Promise<void> {
        this.context = await request.newContext();
    }
    async GetBidInfo(bidId: number, bearerToken: string): Promise<any> {
        if (!this.context) {
            throw new Error('APIRequestContext is not initialized. Call init() first.');
        }
        const bidInfo = await this.context.get(`${process.env.url}/api/distributionBids/get/${bidId}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: bearerToken,
                // другие заголовки, если нужны
            },
        });
        const bidJsonResponse = await bidInfo.json();

        return bidJsonResponse;
    }
}

export default DistributionAPIRequestsClient;
