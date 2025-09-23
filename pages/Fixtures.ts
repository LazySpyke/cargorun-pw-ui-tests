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
  isEmpty?: boolean;
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

  async EmptyBid() {
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
    const apiBidBody = {
      car: carForBid.number,
      driver: driverForBid[0].user.fullName,
      trailer: trailerForBid[0].number,
      legalPerson: legalPersonForBid[0].name,
      firstPointCity: 'Нижний Новгород',
      firstPointEnterDate: moment().subtract(2, 'd').format('DD.MM.YYYY HH:mm'),
      secondPointCity: 'Уфа',
      secondPointEnterDate: moment().add(2, 'd').format('DD.MM.YYYY HH:mm'),
      cargoOwnersBid: cargoOwnerForBid,
      isEmpty: true,
    };
    return apiBidBody;
  }

  async ApiCommonBid({
    responsibleId,
    salesManagerId,
    paymentTypeId,
    ndsTypeId,
    price,
    cargosName,
    typeId,
    planEnterLoadDate,
    planEnterUnloadDate,
  }: {
    responsibleId?: number;
    salesManagerId?: number;
    paymentTypeId: number;
    ndsTypeId: number;
    price: string;
    cargosName?: string;
    typeId?: number;
    planEnterLoadDate: string;
    planEnterUnloadDate: string;
  }) {
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
    const apiBidBody = {
      isExpressBid: false,
      legalPersonId: legalPersonForBid[0].id,
      responsibleId: responsibleId,
      salesManagerId: salesManagerId,
      cargoOwnerDictionaryItemId: cargoOwnerForBid[0].id,
      paymentTypeId: paymentTypeId,
      ndsTypeId: ndsTypeId,
      price: price,
      payment: {
        paymentStatus: 'NotPaid',
      },
      cargos: [
        {
          name: cargosName,
          typeId: typeId,
        },
      ],
      typeOptions: [],
      bidPoints: [
        {
          order: 0,
          type: 'LoadPoint',
          planEnterDate: planEnterLoadDate,
          geozone: {
            location: {
              type: 'Point',
              coordinates: [52.403662, 55.741271999999995],
            },
            address: 'Россия, Республика Татарстан, Набережные Челны',
            geocoderSourceType: 'Yandex',
            locationId: null,
            city: 'Набережные Челны',
            state: 'Республика Татарстан',
            county: 'городской округ Набережные Челны',
            street: null,
            houseNumber: null,
            federalDistrict: 'Приволжский федеральный округ',
            kladrId: null,
            fiasId: null,
            geonameId: null,
            radius: null,
            coordinates: null,
          },
          cargoOwnerDictionaryItemId: null,
          contactPerson: null,
          extendedProperties: [],
          pointIndex: 0,
          counterpartyPointId: null,
          scenarioId: 0,
          intOptions: 0,
        },
        {
          order: 1,
          type: 'UnloadPoint',
          planEnterDate: planEnterUnloadDate,
          geozone: {
            location: {
              type: 'Point',
              coordinates: [37.617698, 55.755863999999995],
            },
            address: 'Россия, Москва',
            geocoderSourceType: 'Yandex',
            locationId: null,
            state: 'Москва',
            county: null,
            street: null,
            houseNumber: null,
            federalDistrict: 'Центральный федеральный округ',
            kladrId: null,
            fiasId: null,
            geonameId: null,
            radius: null,
            coordinates: null,
          },
          cargoOwnerDictionaryItemId: null,
          contactPerson: null,
          extendedProperties: [],
          pointIndex: 1,
          counterpartyPointId: null,
          scenarioId: 0,
          intOptions: 0,
        },
      ],
      documents: [],
      extendedProperties: [],
      driver: {
        id: driverForBid[0].id,
      },
      carOption: {
        number: carForBid.number,
        carId: carForBid.id,
      },
      trailerOption: {
        trailerId: trailerForBid[0].id,
      },
      bookFieldsLoading: false,
      carStatus: {
        lastBidId: null,
        releaseDate: null,
        status: 'Idle',
      },
    };
    return apiBidBody;
  }
}
export type { gerateBidCreateInfo };
