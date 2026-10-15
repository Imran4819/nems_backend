import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '8800', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE: {
    URL: process.env.DATABASE_URL,
    DIALECT: process.env.DATABASE_DIALECT || 'postgres',
    HOST: process.env.DATABASE_HOST || 'localhost',
    PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
    NAME: process.env.DATABASE_NAME || 'nems_db',
    USER: process.env.DATABASE_USER || 'postgres',
    PASSWORD: process.env.DATABASE_PASSWORD || 'postgres',
    STORAGE: process.env.DATABASE_STORAGE,
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'NEMS_SECRET_KEY_SUPER_SECURE_12345',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  },
  LOGGER: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_PINO_PRETTY: process.env.ENABLE_PINO_PRETTY === 'true',
  },
};

export default ENV;
