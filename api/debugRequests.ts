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
}

export default DebugAPIRequestsClient;
