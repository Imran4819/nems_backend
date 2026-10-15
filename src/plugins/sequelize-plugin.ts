import { Sequelize } from 'sequelize';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import logger from './logger-plugins';

declare module 'fastify' {
  interface FastifyInstance {
    sequelize: ExtendedSequelize;
  }
}

export class ExtendedSequelize extends Sequelize {
  private _connectionStatus = {
    isConnected: false,
    lastConnected: undefined as Date | undefined,
    lastError: undefined as Error | undefined,
  };

  async checkConnection() {
    const startTime = Date.now();
    try {
      await this.authenticate();
      const latency = Date.now() - startTime;
      this._connectionStatus = {
        isConnected: true,
        lastConnected: new Date(),
        lastError: undefined,
      };
      logger.info({ latency }, `Database connected successfully. Latency: ${latency}ms`);
      return {
        status: 'connected' as const,
        message: `Database connected successfully. Latency: ${latency}ms`,
        timestamp: new Date(),
      };
    } catch (error) {
      this._connectionStatus = {
        isConnected: false,
        lastConnected: this._connectionStatus.lastConnected,
        lastError: error instanceof Error ? error : new Error(String(error)),
      };
      logger.error({ err: error }, 'Database connection failed');
      return {
        status: 'error' as const,
        message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
    }
  }

  getConnectionStatus() {
    return { ...this._connectionStatus };
  }
}

let sequelizeInstance: ExtendedSequelize;

export function initializeSequelizeInstance(instance: ExtendedSequelize) {
  sequelizeInstance = instance;
}

export function getSequelize(): ExtendedSequelize {
  if (!sequelizeInstance) {
    throw new Error('Sequelize instance not initialized. Make sure database connection is established.');
  }
  return sequelizeInstance;
}

const sequelizePlugin: FastifyPluginAsync = fp(async (fastify) => {
  const databaseUrl = process.env.DATABASE_URL;
  const dialect = (process.env.DATABASE_DIALECT || 'postgres') as 'postgres' | 'sqlite' | 'mysql';

  let sequelize: ExtendedSequelize;

  if (databaseUrl) {
    logger.info('Initializing Sequelize connection using DATABASE_URL (Neon / Cloud Postgres)...');
    sequelize = new ExtendedSequelize(databaseUrl, {
      dialect: 'postgres',
      logging: (sql) => logger.debug({ sql }, 'Sequelize SQL query'),
      define: {
        timestamps: false,
        underscored: true,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  } else if (dialect === 'sqlite') {
    logger.info('Initializing SQLite database connection...');
    const storagePath = process.env.DATABASE_STORAGE || ':memory:';
    sequelize = new ExtendedSequelize({
      dialect: 'sqlite',
      storage: storagePath,
      logging: (sql) => logger.debug({ sql }, 'Sequelize SQL query'),
      define: {
        timestamps: false,
        underscored: true,
      },
    });
  } else {
    logger.info({ dialect }, 'Initializing Sequelize database connection...');
    sequelize = new ExtendedSequelize({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'nems_db',
      dialect: dialect,
      logging: (sql) => logger.debug({ sql }, 'Sequelize SQL query'),
      define: {
        timestamps: false,
        underscored: true,
      },
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  }

  try {
    const connResult = await sequelize.checkConnection();
    if (connResult.status === 'connected') {
      logger.info('Database connection authenticated successfully');
    }

    initializeSequelizeInstance(sequelize);
    fastify.decorate('sequelize', sequelize);

    fastify.addHook('onClose', async () => {
      logger.info('Closing database connection...');
      await sequelize.close();
    });
  } catch (err) {
    logger.error({ err }, 'Error during database authentication in sequelizePlugin');
    // If postgres connection fails and SQLite can be used as dev fallback:
    if (dialect === 'postgres' && process.env.ALLOW_SQLITE_FALLBACK === 'true') {
      logger.warn('Falling back to SQLite database for local development...');
      sequelize = new ExtendedSequelize({
        dialect: 'sqlite',
        storage: './nems_dev.sqlite',
        logging: false,
        define: {
          timestamps: false,
          underscored: true,
        },
      });
      await sequelize.authenticate();
      initializeSequelizeInstance(sequelize);
      fastify.decorate('sequelize', sequelize);
    } else {
      throw err;
    }
  }
});

export default sequelizePlugin;
