import { Page } from '@playwright/test';
import { getAuthData } from '../database';
import APIBid from "../api/bidApi";
import APIRequestsClient from '../api/clienApiRequsets';
import moment from 'moment';
const bidApi = new APIBid();
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
      `${process.env.url}/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=100&$skip=0`,
      await getAuthData(36)
    );
    const driverForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=100&$skip=0`,
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
      `${process.env.url}/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=100&$skip=0`,
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
    carFilter,
    isEmpty,
    loadAddress,
    unloadAddress,
    userIdForFilter,
    paymentStatus,
    reuseCar,
    cargoOwnerFilter,
    legalPersonFilter
  }: {
    responsibleId?: number;
    salesManagerId?: number;
    paymentTypeId: number;
    ndsTypeId: number;
    price: number;
    cargosName?: string;
    typeId?: number;
    planEnterLoadDate: string;
    planEnterUnloadDate: string;
    carFilter?: string,
    isEmpty?: boolean,
    loadAddress: string,
    unloadAddress: string,
    userIdForFilter: number,
    paymentStatus?: string,
    reuseCar?: boolean,
    cargoOwnerFilter?: string,
    legalPersonFilter?: string
  }) {
    const clienApi = new APIRequestsClient();
    let carForBid: any
    let cargoOwner: any
    let legalPerson: any
    await bidApi.init();
    if (carFilter == null) {
      carForBid = await clienApi.getCar(
        `${process.env.url}/api/car/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=100&$skip=0`,
        await getAuthData(userIdForFilter), reuseCar
      );
    }
    else {
      carForBid = await clienApi.getCar(
        `${process.env.url}/api/car/getlist?$filter=${carFilter}&$orderby=lastFixedAt%20desc&$top=100&$skip=0`,
        await getAuthData(userIdForFilter), reuseCar
      );
    }
    const driverForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/driver/getlist?checkOnline=true&withDeleted=true&$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=10&$skip=0`,
      await getAuthData(userIdForFilter)
    );
    const trailerForBid = await clienApi.GetObjectResponse(
      `${process.env.url}/api/trailer/getlist?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=10&$skip=0&withDeleted=true`,
      await getAuthData(userIdForFilter)
    );

    if (cargoOwnerFilter == null) {
      cargoOwner = await clienApi.GetObjectResponse(
        `${process.env.url}/api/cargoOwnerDictionary/get?$filter=(isDeleted%20eq%20false)&$orderby=id%20desc&$top=5&$skip=0&withDeleted=true`,
        await getAuthData(userIdForFilter)
      );
    }
    else {
      cargoOwner = await clienApi.GetObjectResponse(
        `${process.env.url}/api/cargoOwnerDictionary/get?$filter=${cargoOwnerFilter}&$orderby=id%20desc&$top=5&$skip=0&withDeleted=true`,
        await getAuthData(userIdForFilter)
      );
    }


    if (legalPersonFilter == null) {
      legalPerson = null
    }
    else {
      legalPerson = await clienApi.GetObjectResponse(
        `${process.env.url}/api/legalPersons/get?$filter=${legalPersonFilter}&$orderby=id%20desc&$top=5&$skip=0&withDeleted=true`,
        await getAuthData(userIdForFilter)
      );
      legalPerson = legalPerson[0].id
    }
    const emptyBidFlag = isEmpty ?? false;

    const loadPoint = await bidApi.getMixedAddress(
      loadAddress,
      await getAuthData(userIdForFilter)
    );
    const unloadPoint = await bidApi.getMixedAddress(
      unloadAddress,
      await getAuthData(userIdForFilter)
    );
    const paymentPaidStatus = paymentStatus ?? null; //статус оплаты, так как без модуля дебиторской задолженности работать не будет
    const apiBidBody = {
      isEmpty: emptyBidFlag,
      isExpressBid: false,
      legalPersonId: legalPerson,
      responsibleId: responsibleId,
      salesManagerId: salesManagerId,
      cargoOwnerDictionaryItemId: cargoOwner[0].id,
      paymentTypeId: paymentTypeId,
      ndsTypeId: ndsTypeId,
      price: price,
      payment: paymentPaidStatus,
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
              coordinates: loadPoint.suggestions[0].location.coordinates,
            },
            address: loadPoint.suggestions[0].displayName,
            geocoderSourceType: 'Yandex',
            locationId: null,
            city: loadPoint.suggestions[0].address.city,
            state: loadPoint.suggestions[0].address.state,
            county: loadPoint.suggestions[0].address.county,
            street: null,
            houseNumber: null,
            federalDistrict: loadPoint.suggestions[0].address.federalDistrict,
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
              coordinates: unloadPoint.suggestions[0].location.coordinates,
            },
            address: unloadPoint.suggestions[0].displayName,
            geocoderSourceType: 'Yandex',
            locationId: null,
            city: unloadPoint.suggestions[0].address.city,
            state: unloadPoint.suggestions[0].address.state,
            county: unloadPoint.suggestions[0].address.county,
            street: null,
            houseNumber: null,
            federalDistrict: unloadPoint.suggestions[0].address.federalDistrict,
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
        fullName: driverForBid[0].user.fullName
      },
      carOption: {
        number: carForBid.number,
        carId: carForBid.id,
        carTracker: carForBid.trackerDeviceNumber
      },
      trailerOption: {
        trailerId: trailerForBid[0].id,
        number: trailerForBid[0].number
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
