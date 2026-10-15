import { FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';
import { LoginRequest } from '../interfaces/auth.interface';
import logger from '../plugins/logger-plugins';

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const loginData = request.body as LoginRequest;
      logger.info({ body: { ...loginData, password: '[REDACTED]' } }, 'AuthController.login: handling login request');

      const result = await authService.login(loginData);
      if (!result.success) {
        return reply.code(401).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AuthController.login: unexpected error during login');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.code(200).send({
        success: true,
        user: request.user,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'AuthController.me: failed to fetch profile');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

export default new AuthController();
