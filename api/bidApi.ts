import { request, APIRequestContext } from '@playwright/test';
import moment from 'moment';
class APIRequestsClient {
  private context: APIRequestContext | null = null;

  async init(): Promise<void> {
    this.context = await request.newContext();
  }

  async apply(body: any, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const response = await this.context.post(`${process.env.url}/api/truckingbids/apply`, {
      data: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    console.log(response);
    const jsonResponse = await response.json();
    return jsonResponse;
  }
  async setStatus(bidId: any, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const response = await this.context.post(`${process.env.url}/api/truckingbids/setStatus`, {
      data: { bidId: bidId, status: 'Started' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    console.log(`text${await response.text()}}`);
    if (response.status() != 200) {
      const errorText = await response.text();
      const spiltText = errorText.split(' ');
      console.log(spiltText);
      const bidError = spiltText[5].replace(/\D+/g, '');
      console.log(bidError);
      await this.context.post(`${process.env.url}/api/truckingbids/revert`, {
        data: { bidId: bidError },
        headers: {
          'Content-Type': 'application/json',
          Authorization: bearerToken,
          // другие заголовки, если нужны
        },
      });
      const responseAfterRevert = await this.context.post(`${process.env.url}/api/truckingbids/setStatus`, {
        data: { bidId: bidId, status: 'Started' },
        headers: {
          'Content-Type': 'application/json',
          Authorization: bearerToken,
          // другие заголовки, если нужны
        },
      });
      const jsonResponse = await responseAfterRevert.json();

      return jsonResponse;
    } else {
      const jsonResponse = await response.json();

      return jsonResponse;
    }
  }

  async cancelBid(bidId: any, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const response = await this.context.post(`${process.env.url}/api/bids/cancel`, {
      data: { bidId: bidId },
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    console.log(response);
    const jsonResponse = await response.json();
    return jsonResponse;
  }

  async revertBid(bidId: any, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const response = await this.context.post(`${process.env.url}/api/truckingbids/revert`, {
      data: { bidId: bidId },
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    console.log(response);
    const jsonResponse = await response.json();
    return jsonResponse;
  }

  async ForceCompletedBid(bidId: number, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const bidInfo = await this.context.get(`${process.env.url}/api/bids/get/${bidId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    const bidJsonResponse = await bidInfo.json();
    const bidPointsArray = bidJsonResponse.bidPoints.map(function (elem) {
      const timeOffset = elem.planEnterDateOffset.split('+');
      console.log(timeOffset);
      return {
        id: elem.id,
        enteredAtByLogist: moment(elem.planEnterDate).format('YYYY-MM-DD HH:mm'),
        loadUnloadedAtByLogist: moment(elem.planEnterDate).add(1, 'm').format('YYYY-MM-DD HH:mm'),
        timeOffset: `+${timeOffset[1]}`,
        errors: {},
      };
    });
    const response = await this.context.post(`${process.env.url}/api/truckingbids/forceComplete`, {
      data: {
        isValid: true,
        bidId: bidId,
        bidPoints: bidPointsArray,
        reason: 'автоматическое закрытие',
        mileage: Math.ceil(bidJsonResponse.planMileage / 1000),
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    const jsonResponse = await response.json();
    return jsonResponse;
  }

  async GetBidInfo(bidId: number, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const bidInfo = await this.context.get(`${process.env.url}/api/bids/get/${bidId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    const bidJsonResponse = await bidInfo.json();

    return bidJsonResponse;
  }
  async GetCarsList(carId: number, bearerToken: string, orgId: number): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const bidInfo = await this.context.get(`${process.env.url}/api/forwarding/getcarslist?organizationids=${orgId}&$orderby=id asc&$top=1000&$skip=0&$filter=id eq ${carId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    const bidJsonResponse = await bidInfo.json();

    return bidJsonResponse;
  }
  //TODO перекинуть в другое место/создать
  async getMixedAddress(address: any, bearerToken: string): Promise<any> {
    if (!this.context) {
      throw new Error('APIRequestContext is not initialized. Call init() first.');
    }
    const response = await this.context.post(`${process.env.url}/api/map/getmixedaddresses`, {
      data: { address: address },
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
        // другие заголовки, если нужны
      },
    });
    console.log(response);
    const jsonResponse = await response.json();
    return jsonResponse;
  }
}

export default APIRequestsClient;
