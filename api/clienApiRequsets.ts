import { test, expect } from "@playwright/test";
import APIRequests from "../api/apiRequests";
import { addCar, getUsedCar, addAuthData } from "../database";
class APIRequestsClient {
  async getCar(endpoint: string, authHeaders: string) {
    var foundCar: any;
    const api = new APIRequests();
    await api.init();
    await api.getData(endpoint, authHeaders).then(async (cars: any) => {
      for (const car of cars) {
        console.log(car);
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
  async getToken(username, password) {
    var date: Date = new Date(); // Explicit type declaration
    const api = new APIRequests();
    await api.init();
    const authEndpoint = `${process.env.url}/api/Account/GenerateToken`; // Замените на ваш URL
    const credentials = {
      username: username,
      password: password,
    }; // Замените на ваши учетные данные
    const userinfo = await api.authorize(authEndpoint, credentials);
    var auth = {
      info: userinfo,
      expires_at: date,
      userid: userinfo.currentUser.id,
    };
    await addAuthData(auth);
  }
}

export default APIRequestsClient;
