import { AssertionError } from "assert";
import { Client } from "pg"; // Импортируем клиент для работы с PostgreSQL

// Интерфейс для авторизационных данных
interface AuthData {
  info: string;
  expires_at: Date;
  userid: number;
}

// Интерфейс для данных о машине
interface CarData {
  carId: number;
  carNumber: string;
  tracker: string;
}

const client = new Client({
  user: process.env.dbUser, // Ваше имя пользователя
  host: process.env.dbHost, // Хост (обычно localhost)
  database: process.env.dbName, // Название вашей базы данных
  password: process.env.dbPassword, // Ваш пароль
  port: process.env.dbPort, // Порт (по умолчанию 5432)
});

// Функция для инициализации базы данных
export const initDB = async (): Promise<void> => {
  await client.connect();
  await client.query(`
        CREATE TABLE IF NOT EXISTS auth (
            id SERIAL PRIMARY KEY,
            info TEXT,
            expires_at TIMESTAMP,
            userId INTEGER
        );
    `);
  await client.query(`
        CREATE TABLE IF NOT EXISTS cars (
            id SERIAL PRIMARY KEY,
            carId INTEGER,
            carNumber TEXT,
            tracker TEXT
        );
    `);
};

// Функция для добавления авторизационных данных в БД
export const addAuthData = async (data: AuthData) => {
  const { info, expires_at, userid } = data;
  console.log(data);
  await client.query(
    "INSERT INTO auth (info, expires_at, userid) VALUES ($1, $2, $3)",
    [info, expires_at, userid]
  );
};

// Функция для получения авторизационных данных по id
export const getAuthData = async (userId: number) => {
  console.log(`userid=${userId}`);
  const res = await client.query("SELECT * FROM auth WHERE userid = $1 ORDER BY id DESC", [
    userId
  ]);
  const onlyToken: string = JSON.parse(
    res.rows[0].info).accessToken.token.toString();
  return `Bearer ${onlyToken}`;
};

// Функция для добавления машины в БД
export const addCar = async (
  carId: number,
  carNumber: string,
  tracker: string
) => {
  await client.query(
    "INSERT INTO cars (carId, carNumber,tracker) VALUES ($1, $2, $3)",
    [carId, carNumber, tracker]
  );
};

export const deleteCarById = async (carId: number) => {
  await client.query(
    "DELETE FROM cars WHERE carId = $1",
    [carId]
  );
}

// Функция для получения машины по id
export const getUsedCar = async (carId: number, tryIndex?: number) => {
  console.log(`проверяем ${carId}`);
  const res = await client.query("SELECT * FROM cars WHERE carId = $1", [
    carId,
  ]);
  if (res.rows.length > 0) {
    return true;
  } else {
    return false;
  }
};

// Функция для закрытия соединения с базой данных
export const closeDB = async () => {
  await client.end();
};

// Обернем инициализацию базы данных в асинхронную функцию
(async () => {
  await initDB();
})();
