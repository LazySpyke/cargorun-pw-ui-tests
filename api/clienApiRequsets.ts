import APIRequests from "../api/apiRequests";
import { addCar, getUsedCar, addAuthData, deleteCarById } from "../database";
class APIRequestsClient {
  readonly api;
  constructor() {
    this.api = new APIRequests();
  }
  async getCar(endpoint: string, authHeaders: string, bdfilter?: boolean) {
    let foundCar: any;
    const filter = bdfilter ?? false;
    await this.api.init();
    await this.api.getData(endpoint, authHeaders).then(async (cars: any) => {
      if (filter == false) {
        for (const car of cars) {
          if (!(await getUsedCar(car.id))) {
            foundCar = car; // Сохраним найденный объект
            await addCar(
              foundCar.id,
              foundCar.number,
              foundCar.trackerDeviceNumber
            );
            break; // Остановим цикл при первом совпадении
          }
        }
      }
      else {
        foundCar = cars[0];
      }
    });
    return foundCar;
  }
  async deleteUsedCar(carId: number) {
    await deleteCarById(carId)
  }
  async GetObjectResponse(endpoint: string, authHeaders: string) {
    let responseBody: any;
    await this.api.init();
    await this.api.getData(endpoint, authHeaders).then((response: any) => {
      responseBody = response;
    });
    console.log(responseBody);
    return responseBody;
  }
  async getToken(username: string, password: string) {
    console.log(username, password);
    const date: Date = new Date(); // Explicit type declaration
    await this.api.init();
    const authEndpoint = `${process.env.url}/api/Account/GenerateToken`; // Замените на ваш URL
    const credentials = {
      username: username,
      password: password,
    }; // Замените на ваши учетные данные
    const userinfo = await this.api.authorize(authEndpoint, credentials);
    const auth = {
      info: userinfo,
      expires_at: date,
      userid: userinfo.currentUser.id,
    };
    await addAuthData(auth);
  }
}

export default APIRequestsClient;
