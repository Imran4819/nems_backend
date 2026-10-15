import { FastifyInstance } from 'fastify';
import classController from '../controllers/class.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function classRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Class CRUD routes
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'CLASSES'], ['R']) },
    classController.getAllClasses
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'CLASSES'], ['R']) },
    classController.getClassById
  );

  fastify.get('/:id', classController.getClassById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'CLASSES'], ['C']) },
    classController.createClass
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'CLASSES'], ['U']) },
    classController.updateClass
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'CLASSES'], ['D']) },
    classController.deleteClass
  );
}
