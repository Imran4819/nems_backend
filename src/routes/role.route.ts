import { FastifyInstance } from 'fastify';
import roleController from '../controllers/role.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function roleRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  fastify.get('/permissions', roleController.getAllPermissions);
  fastify.get('/client/:client_id', roleController.getAllRoles);
  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['UR', 'ROLES'], ['R']) },
    roleController.getRoleById
  );
  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['UR', 'ROLES'], ['C']) },
    roleController.createRole
  );
  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['UR', 'ROLES'], ['U']) },
    roleController.updateRole
  );
  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['UR', 'ROLES'], ['D']) },
    roleController.deleteRole
  );
  fastify.patch(
    '/client/:client_id/:id/assign',
    { preHandler: TokenService.checkPermission(['UR', 'ROLES'], ['U']) },
    roleController.setRolePermissions
  );
}
