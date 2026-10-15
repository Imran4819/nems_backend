import { FastifyInstance } from 'fastify';
import logger from '../plugins/logger-plugins';

export async function initializeMigrations(fastify: FastifyInstance) {
  try {
    logger.info('Migrations loader: checking schema sync...');
    if (process.env.NODE_ENV !== 'production') {
      await fastify.sequelize.sync({ alter: false });
      logger.info('Database synchronized successfully.');
    }
  } catch (error: any) {
    if (error?.original?.code === '23505' || error?.name === 'SequelizeUniqueConstraintError') {
      logger.warn(
        { detail: error?.original?.detail || error.message },
        'Schema tables/types already exist in the database. Continuing without alter.'
      );
    } else {
      logger.error({ err: error }, 'Error during migration/schema sync');
      throw error;
    }
  }
}
