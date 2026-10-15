import type { FastifyInstance } from 'fastify';
import Swagger from '@fastify/swagger';
import SwaggerUi from '@fastify/swagger-ui';
import logger from '../plugins/logger-plugins';

const configSwagger = {
  swagger: {
    info: {
      title: 'Nems Backend API',
      description: 'API documentation for Nems Platform (User, Client, Role Management with Incharge and Superadmin parity)',
      version: '1.0.0',
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey' as 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'JWT Authorization header using Bearer scheme. Format: "Bearer {token}"',
      },
    },
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
};

const configSwaggerUi = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list' as 'list' | 'full' | 'none',
    deepLinking: true,
  },
  staticCSP: true,
};

export default async function LoadSwagger(instance: FastifyInstance) {
  try {
    await instance.register(Swagger, configSwagger);
    await instance.register(SwaggerUi, configSwaggerUi);
    logger.info('Swagger documentation registered at /docs');
  } catch (error) {
    logger.error({ err: error }, 'Failed to load Swagger documentation');
  }
}
