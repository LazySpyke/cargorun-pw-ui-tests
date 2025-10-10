import { request, APIRequestContext } from '@playwright/test';
import moment from 'moment';
class SupportAPIRequestsClient {
    private context: APIRequestContext | null = null;

    async init(): Promise<void> {
        this.context = await request.newContext();
    }

    async coordinatSend(trakerImei: string, startTime?: string, startPoint?: [], lastPoint?: []): Promise<any> {
        if (!this.context) {
            throw new Error('SupportAPIRequestsClient is not initialized. Call init() first.');
        }
        if (startTime == null) {
            startTime = moment().add(-3, 'h').add(-1, 'm').format("YYYY-MM-DDTHH:mm:ss+00:00")
        }
        if (startPoint == null) {
            startPoint = [
                49.266643326093124,
                55.673454156069425
            ]
        }
        console.log(startPoint)
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
                    "SpeedKmh": 80,
                    "Scripts": [
                        {
                            "StartTime": null,
                            "EndTime": null,
                            "RandomPoint": false,
                            "RandomPointBounds": null,
                            "GotoPoint": {
                                "Latitude": startPoint[1],
                                "Longitude": startPoint[0]
                            },
                            "SpeedKmh": null,
                            "Duration": "00:00:01",
                            "Stop": true,
                            "PointsCount": 1,
                            "RadiusM": 0,
                            "LuquidSensorValue": 0,
                            "LiquidSensorConsumptionL100Km": 33,
                            "LiquidSensors": [
                                {
                                    "Number": 7,
                                    "Address": 65530,
                                    "Value": 21,
                                    "ChangePer100Km": 0
                                },
                                {
                                    "Number": 7,
                                    "Address": 65531,
                                    "Value": 22,
                                    "ChangePer100Km": 0
                                },
                                {
                                    "Number": 7,
                                    "Address": 65532,
                                    "Value": 23,
                                    "ChangePer100Km": 0
                                },
                                {
                                    "Number": 7,
                                    "Address": 65533,
                                    "Value": 25,
                                    "ChangePer100Km": 0
                                },
                                {
                                    "Number": 5,
                                    "Address": 65530,
                                    "Value": 274,
                                    "ChangePer100Km": 33
                                },//температурный режим 1
                                {
                                    "Number": 6,
                                    "Address": 65530,
                                    "Value": 275,
                                    "ChangePer100Km": 33
                                }, //температурный режим 2
                                {
                                    "Number": 2,
                                    "Address": 65531,
                                    "Value": 100000,
                                    "ChangePer100Km": 0
                                } //одометр
                            ]
                        },
                    ],
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
                    "Host": process.env.sendIP,
                    "Port": process.env.sendPort
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
        } else {
            const jsonResponse = await response.json();

            return jsonResponse;
        }
    }
}

export default SupportAPIRequestsClient;
