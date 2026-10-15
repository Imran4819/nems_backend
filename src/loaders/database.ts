import { FastifyInstance } from 'fastify';
import logger from '../plugins/logger-plugins';

export async function checkDatabaseConnection(fastify: FastifyInstance) {
  try {
    const status = await fastify.sequelize.checkConnection();
    return {
      connected: status.status === 'connected',
      message: status.message,
    };
  } catch (error: any) {
    logger.error({ err: error }, 'checkDatabaseConnection failed');
    return {
      connected: false,
      message: error.message,
    };
  }
}
