import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const prettyPinoEnabled = process.env.ENABLE_PINO_PRETTY === 'true';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(prettyPinoEnabled && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
