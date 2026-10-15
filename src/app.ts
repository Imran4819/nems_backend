import fastify, { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import formBodyPlugin from '@fastify/formbody';
import LoadSwagger from './config/swagger';
import modelInitializationPlugin from './plugins/modelinitializer-plugin';
import sequelizePlugin from './plugins/sequelize-plugin';
import { createMasterData } from './config/masterdata';
import { initializeMigrations } from './loaders/migrations';
import pino from 'pino';
import logger from './plugins/logger-plugins';
import routes from './routes/index';

dotenv.config();

// Server configuration
const PORT = parseInt(process.env.PORT || '8800', 10);
const HOST = process.env.HOST || '0.0.0.0';
const prettyPinoEnabled = process.env.ENABLE_PINO_PRETTY === 'true';

/**
 * Create and configure Fastify server instance
 */
const app: FastifyInstance = fastify({
  pluginTimeout: 60000,
  bodyLimit: 104857600, // 100MB body limit
  logger: prettyPinoEnabled
    ? {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
      },
});

function registerGlobalErrorHandling() {
  // Add request logging
  app.addHook('onRequest', async (request, reply) => {
    app.log.info({
      req_id: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      query: request.query,
      userAgent: request.headers['user-agent'],
    }, 'Incoming request');
  });

  // Add response logging
  app.addHook('onResponse', async (request, reply) => {
    app.log.info({
      req_id: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime(),
    }, 'Outgoing response');
  });

  // Add error logging hook
  app.addHook('onError', async (request, reply, error) => {
    app.log.error({
      req_id: request.id,
      method: request.method,
      url: request.url,
      error: error.message,
      stack: error.stack,
      statusCode: reply.statusCode,
    }, 'Request error');
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error({
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
      statusCode: error.statusCode,
    }, 'Global error handler caught exception');

    // Handle CORS errors specifically
    if (error.message.includes('CORS') || error.statusCode === 403) {
      reply.status(403).send({
        success: false,
        error: 'CORS or Access Error',
        message: error.message,
      });
      return;
    }

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });
}

function registerCorePlugins() {
  app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
  });

  app.register(formBodyPlugin);
}

// Health check endpoint
app.get('/health-check', async (request, reply) => {
  try {
    const conn = await app.sequelize.checkConnection();
    return reply.status(200).send({
      message: 'Database Connected',
      name: 'Nems Backend Platform API',
      version: '1.0.0',
      status: 200,
      database: conn,
      timestamp: new Date().toUTCString(),
    });
  } catch (error) {
    return reply.status(503).send({
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

async function registerRoutes() {
  await app.register(routes, { prefix: '/api' });
  // Also register at root for convenience
  await app.register(routes);
}

/**
 * Main server bootstrap function
 */
const start = async () => {
  try {
    logger.info('Starting Nems Backend application initialization...');

    // 1. Error handling hooks first
    registerGlobalErrorHandling();

    // 2. Core middleware plugins
    registerCorePlugins();

    // 3. Register Sequelize DB connection
    await app.register(sequelizePlugin);

    // 4. Register models & associations
    await app.register(modelInitializationPlugin);

    // 5. Database synchronization
    await initializeMigrations(app);

    // 6. Master data seeding (Roles, Permissions, Super Admin, Incharge)
    await createMasterData();

    // 7. Load Swagger UI API documentation
    await LoadSwagger(app);

    // 8. Register API route modules
    await registerRoutes();

    // 9. Start listening
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Server successfully running on http://localhost:${PORT}`);
    logger.info(`Swagger API Documentation available at http://localhost:${PORT}/docs`);
  } catch (err) {
    logger.error({ err }, 'Fatal error during server startup');
    process.exit(1);
  }
};

start();

export default app;
