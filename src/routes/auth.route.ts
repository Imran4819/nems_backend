import { FastifyInstance } from 'fastify';
import authController from '../controllers/auth.controller';
import { decodeToken } from '../middleware/verify_token';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', authController.login);
  fastify.get('/me', { preHandler: decodeToken }, authController.me);
}
