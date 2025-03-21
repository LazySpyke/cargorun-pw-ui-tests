import APIRequests from "../api/apiRequests";
import { addCar, getUsedCar, addAuthData } from "../database";
class APIRequestsClient {
  readonly api;
  constructor() {
    this.api = new APIRequests();
  }
  async getCar(endpoint: string, authHeaders: string) {
    let foundCar: any;
    await this.api.init();
    await this.api.getData(endpoint, authHeaders).then(async (cars: any) => {
      for (const car of cars) {
        // console.log(car);
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
    });
    return foundCar;
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
