import { test, expect } from "@playwright/test";
import APIRequests from "../api/apiRequests";
import APIRequestsClient from "../api/clienApiRequsets";
// import { globals } from '../globals'; // Импортируйте глобальные переменные
import {
  initDB,
  addAuthData,
  getAuthData,
  addCar,
  getUsedCar,
  closeDB,
} from "../database";

test("Проверка API-запроса с авторизацией", async () => {
  const api = new APIRequests();
  await api.init();
  // Используем токен для выполнения GET-запроса
  const data = await api
    .getData(
      "https://test.cargorun.ru/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=200&$skip=0",
      await getAuthData(36)
    )
    .then((cars: any) => {
      addCar(cars[100].id, cars[100].number, cars[100].trackerDeviceNumber);
    });
  // expect(data).toBeDefined();
  // // globals.carUseGlobalList.push(data[0])
  // // console.log(globals.carUseGlobalList)
  await api.close();
});

test.beforeAll(async () => {
  const clienApi = new APIRequestsClient();
  await clienApi.getToken(process.env.rootMail as string, process.env.rootPassword as string);
});
