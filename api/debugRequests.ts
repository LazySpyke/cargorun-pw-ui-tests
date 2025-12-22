import { request, APIRequestContext } from '@playwright/test';
class DebugAPIRequestsClient {
    private context: APIRequestContext | null = null;

    async init(): Promise<void> {
        this.context = await request.newContext();
    }

    async runTask(name: string, bearerToken: string): Promise<any> {
        if (!this.context) {
            throw new Error('APIRequestContext is not initialized. Call init() first.');
        }
        const response = await this.context.post(`${process.env.url}/api/dev/task/run`, {
            data: { name: name },
            headers: {
                'Content-Type': 'application/json',
                Authorization: bearerToken,
                // другие заголовки, если нужны
            },
        });
        console.log(response.status);
    }
    async applyOdometerValues(bearerToken: string, trackerId: number, startValue: number, startDate: string, numberOfEntries: number): Promise<any> {
        if (!this.context) {
            throw new Error('APIRequestContext is not initialized. Call init() first.');
        }

        const data = [];
        let currentValue = startValue;
        const currentDate = new Date(startDate);

        for (let i = 0; i < numberOfEntries; i++) {
            // Генерируем случайное время между 20 минутами и 1 часом
            const minMinutes = 10;
            const maxMinutes = 10;
            const minutesDiff = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;

            // Обновляем дату
            currentDate.setMinutes(currentDate.getMinutes() + minutesDiff);
            const fixedAt = new Date(currentDate).toISOString();

            // Генерируем приближенный пробег за это время (например, 10-20 км/час)
            // За интервал в минутах пробег будет примерно: (минуты / 60) * скорость
            const minSpeed = 60; // км/ч
            const maxSpeed = 80; // км/ч
            const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;

            const kmIncrement = (speed * minutesDiff) / 60; // пробег за интервал

            currentValue += Math.round(kmIncrement);

            data.push({
                value: currentValue,
                fixedAt: fixedAt,
                isCorrect: true
            });
        }
        const response = await this.context.post(`${process.env.url}/api/dev/tracker/applyOdometerValues`, {
            data: {
                "trackerId": trackerId,
                values: data
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: bearerToken,
                // другие заголовки, если нужны
            },
        });
        console.log(response.status);
    }


    async newCarTracker(userToken: string, roottoken: string, carNumber?: string, carTracker?: string, beginDate?: string, logistId?: number, kolumnId?: number): Promise<any> {
        if (!this.context) {
            throw new Error('APIRequestContext is not initialized. Call init() first.');
        }
        const trackerCreateResponse = await this.context.post(`${process.env.url}/api/Trackers/Apply`, {
            data: {
                type: "Autograf",
                deviceNumber: carTracker,
                organizationId: null,
                id: 0
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: roottoken,
                // другие заголовки, если нужны
            },
        });
        if (trackerCreateResponse.status() != 200) {
            throw new Error(`ошибка при запросе api/Trackers/Apply, статус ${trackerCreateResponse.status()},${trackerCreateResponse.text()}`)
        }
        const carCreateResponse = await this.context.post(`${process.env.url}/api/car/apply`, {
            data: {
                "isValid": true,
                "number": carNumber,
                "brandTypeId": process.env.carBrandTypeId,
                "typeId": process.env.carTypeId,
                "transportColumnId": kolumnId ?? null,
                "logistId": logistId ?? null,
                "fuelTanks":
                    [{
                        "minimumVolume": 100,
                        "currentVolume": 200,
                        "totalVolume": 800,
                        "fuelConsumption": 33,
                        "minimumFuelTankVolume": 120,
                        "finishFuelVolume": 700,
                        "type": "Diesel"
                    }], "selectedOptions": {}
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: userToken,
                // другие заголовки, если нужны
            },
        });
        if (carCreateResponse.status() != 200) {
            throw new Error(`ошибка при запросе api/car/apply, статус ${carCreateResponse.status()},${carCreateResponse.json()}`)
        }
        const carCreateResponseJSON = await carCreateResponse.json()
        const trackerCreateResponseJSON = await trackerCreateResponse.json()

        console.log(carCreateResponseJSON, trackerCreateResponseJSON)
        const attachedTracker = await this.context.post(`${process.env.url}/api/trackers/attach`, {
            data: { CarId: carCreateResponseJSON.id, Id: trackerCreateResponseJSON.entityId },
            headers: {
                'Content-Type': 'application/json',
                Authorization: userToken,
                // другие заголовки, если нужны
            },
        });
        if (attachedTracker.status() != 200) {
            throw new Error(`ошибка при запросе api/trackers/attach, статус ${attachedTracker.status()},${await attachedTracker.json()}`)
        }
        const getHistoryItems = await this.context.get(`${process.env.url}/api/trackers/getHistoryItems/${trackerCreateResponseJSON.entityId}?$orderby=id%20desc&$top=10&$skip=0`, {
            data: {
                type: "Autograf",
                deviceNumber: carTracker,
                organizationId: null,
                id: 0
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: roottoken,
                // другие заголовки, если нужны
            },
        });
        const getHistoryItemsJSON = await getHistoryItems.json()
        const applyHistoryResponse = await this.context.post(`${process.env.url}/api/trackers/applyHistoryItem`, {
            data: {
                trackerId: trackerCreateResponseJSON.entityId,
                id: getHistoryItemsJSON[0].id,
                entityId: getHistoryItemsJSON[0].entityId,
                startedAt: beginDate,
                endedAt: null,
                type: "Car",
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: roottoken,
                // другие заголовки, если нужны
            },
        });
        if (applyHistoryResponse.status() != 204 && applyHistoryResponse.status() != 200) {
            throw new Error(`ошибка при запросе api/trackers/applyHistoryItem, статус ${applyHistoryResponse.status()}`)
        }
        return {
            newTrackerId: trackerCreateResponseJSON.entityId,
            newCarId: carCreateResponseJSON.id,
            newCarNumber: carNumber
        }
    }
    async deactivateCityPlanning(orgId: number, bearerToken: string): Promise<any> {
        if (!this.context) {
            throw new Error('APIRequestContext is not initialized. Call init() first.');
        }
        const response = await this.context.post(`${process.env.url}/api/dev/grain/deactivate?name=IPlanningCacheGrain&id=${orgId}&persistent=false`, {
            data: {},
            headers: {
                'Content-Type': 'application/json',
                Authorization: bearerToken,
                // другие заголовки, если нужны
            },
        });
        console.log(`статус деактивации Планирования по городам ${response.status()} у компании ${orgId}`)
    }
}

export default DebugAPIRequestsClient;
