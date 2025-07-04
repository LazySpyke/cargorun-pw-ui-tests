import { Page } from '@playwright/test';
import { getAuthData } from '../database';
import APIRequestsClient from '../api/clienApiRequsets';
import moment from 'moment';
type gerateBidCreateInfo = {
  car: string;
  driver: string;
  trailer: string;
  firstPointCity: string;
  firstPointEnterDate: string;
  secondPointCity: string;
  secondPointEnterDate: string;
  legalPerson: string;
  cargoOwnersBid: any;
};
export class BidCreateInfo {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async CommonBid() {
    const clienApi = new APIRequestsClient();
    const carForBid = await clienApi.getCar(
      `${process.env.url}/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=20&$skip=0`,
      await getAuthData(36)
    );
    const driverForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=10&$skip=0`,
      await getAuthData(36)
    );
    const trailerForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/trailer/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=10&$skip=0&withDeleted=true`,
      await getAuthData(36)
    );
    const cargoOwnerForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/cargoOwnerDictionary/get?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=5&$skip=0&withDeleted=true`,
      await getAuthData(36)
    );
    const legalPersonForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/legalPersons/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=5&$skip=0&withDeleted=true`,
      await getAuthData(36)
    );
    const prepearBidInfo: gerateBidCreateInfo = {
      car: carForBid.number,
      driver: driverForBid[0].user.fullName,
      trailer: trailerForBid[0].number,
      legalPerson: legalPersonForBid[0].name,
      firstPointCity: 'Набережные Челны',
      firstPointEnterDate: moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'),
      secondPointCity: 'Казань',
      secondPointEnterDate: moment().add(2, 'd').format('DD.MM.YYYY HH:mm'),
      cargoOwnersBid: cargoOwnerForBid,
    };
    return prepearBidInfo;
  }
}
export type { gerateBidCreateInfo };
