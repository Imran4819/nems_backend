import { FastifyInstance } from 'fastify';
import userController from '../controllers/user.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // User Management CRUD
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['U', 'USERS'], ['R']) },
    userController.getAllUsers
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['U', 'USERS'], ['R']) },
    userController.getUserById
  );

  fastify.get('/:id', userController.getUserById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['U', 'USERS'], ['C']) },
    userController.createUser
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['U', 'USERS'], ['U']) },
    userController.updateUser
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['U', 'USERS'], ['D']) },
    userController.deleteUser
  );
}
