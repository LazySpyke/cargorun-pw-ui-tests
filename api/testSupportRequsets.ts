import { request, APIRequestContext } from '@playwright/test';
import { console } from 'inspector';
import moment from 'moment';
interface LiquidSensor {
    Number: number;
    Address: number;
    Value: number;
    ChangePer100Km: number;
}

class SupportAPIRequestsClient {
    private context: APIRequestContext | null = null;

    async init(): Promise<void> {
        this.context = await request.newContext();
    }

    async createSegments(coords: any[], LiquidSensors?: LiquidSensor[], stopOnPoint?: string): any[] {
        console.log(`coords= ${coords}
            stopOnPoint=${stopOnPoint}`)
        const result: any[] = [];
        console.log(coords)
        coords.forEach(([lon, lat]) => {
            // 1. Едет до точки
            result.push({
                StartTime: null,
                EndTime: null,
                RandomPoint: false,
                RandomPointBounds: null,
                GotoPoint: { Latitude: lat, Longitude: lon },
                SpeedKmh: null,
                Duration: null,
                Stop: false,
                PointsCount: null,
                RadiusM: null,
                LuquidSensorValue: null,
                LiquidSensorConsumptionL100Km: null,
                LiquidSensors: LiquidSensors,
            });
            // 2. Остановка на точке (если нужно)
            if (stopOnPoint !== null) {
                result.push({
                    StartTime: null,
                    EndTime: null,
                    RandomPoint: false,
                    RandomPointBounds: null,
                    GotoPoint: { Latitude: lat, Longitude: lon },
                    SpeedKmh: null,
                    Duration: stopOnPoint,
                    Stop: true,
                    PointsCount: 10,
                    RadiusM: 0,
                    LuquidSensorValue: 0,
                    LiquidSensorConsumptionL100Km: 33,
                    LiquidSensors: LiquidSensors
                });
            }
        });
        console.log(`result=${JSON.stringify(result)}`)
        return result;
    }
    //TODO реализовать генератор json'ки и больше параметров для датчиков
    async coordinatSend(trakerImei: string, startTime?: string, startPoint?: [], routePoints?: any[], sensors?, stopDuration?: string, SpeedKmh?: number, endDate?: string): Promise<any> {
        if (!this.context) {
            throw new Error('SupportAPIRequestsClient is not initialized. Call init() first.');
        }
        if (startTime == null) {
            startTime = moment().add(-3, 'h').add(-1, 'm').format("YYYY-MM-DDTHH:mm:ss+00:00")
        }
        if (startPoint == null) {
            startPoint = [49.266643326093124, 55.673454156069425]
        }
        console.log(startTime)
        const jsonForRoute = await this.createSegments(routePoints, sensors, stopDuration)
        if (endDate != null) {
            jsonForRoute[jsonForRoute.length - 1].EndTime = endDate
        }
        const response = await this.context.post(`${process.env.trackerEmulatorHost}`, {
            data: {
                "Emulator": null,
                "Scenario": {
                    "StartTime": startTime,
                    "StartPoint": {
                        "Latitude": startPoint[1],
                        "Longitude": startPoint[0]
                    },
                    "RandomPointBounds": null,
                    "SpeedKmh": SpeedKmh ?? 80,
                    "Scripts":
                        jsonForRoute
                    ,
                    "BetweenScriptInterval": null,
                    "LoopScripts": false,
                    "TrackerImei": trakerImei,
                    "TrackerObjectIdentifier": null,
                    "LiquidSensorNumber": null,
                    "LiquidSensorAddress": null,
                    "LiquidSensorValue": 0,
                    "LiquidSensorConsumptionL100Km": 0,
                    "BreakIfFuture": false
                },
                "PointsGenerator": null,
                "TrackerLogGenerator": null,
                "TrackerLogSend": null,
                "Osrm": {
                    "Host": process.env.osrmHost,
                    "Profile": "driving"
                },
                "SendServer": {
                    "Host": process.env.sendHost,
                    "Port": process.env.sendIP
                }
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${process.env.trackerEmulatorAuth}`,
                // другие заголовки, если нужны
            },
        });
        console.log(`text${await response.text()}}`);
        if (response.status() != 200) {
            const errorText = await response.text();
            console.log(errorText)
            throw new Error(`ошибка при отправке ${errorText}`);
        }
    }

    async generateCarNumber() {
        let leters = '';
        const customRandom = (min, max) => {
            return Math.floor(Math.random() * (max - min)) + min;
        }
        const randomThreeDigs = (min, max) => {
            let str = Math.floor(Math.random() * (max - min)) + min;
            if (str.toString().length == 2) str = '0' + str;
            if (str.toString().length == 1) str = '00' + str;
            return str;
        }
        const setOfLeters = 'АВУКМНОРСТУХ';
        const strNumDigs = randomThreeDigs(1, 999);
        let regionDig = String(randomThreeDigs(1, 999));
        regionDig = regionDig.substr(1, 2);
        for (let i = 0; i < 3; i++) {
            leters += setOfLeters[customRandom(0, setOfLeters.length - 1)];
        };
        const CarNumberString = leters[0] + String(randomThreeDigs(1, 999)) + leters[1] + leters[2] + '/' + regionDig;
        return CarNumberString
    }
    async generateTrackerNumber(name: string) {
        const randomTrackerName = Math.floor(Math.random() * 90000000) + 10000;
        const trackerNumber = `${name}${randomTrackerName}`
        return trackerNumber
    }
}

export default SupportAPIRequestsClient;
