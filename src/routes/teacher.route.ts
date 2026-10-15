import { FastifyInstance } from 'fastify';
import teacherController from '../controllers/teacher.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function teacherRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Teacher CRUD routes
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'TEACH', 'TEACHERS'], ['R']) },
    teacherController.getAllTeachers
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'TEACH', 'TEACHERS'], ['R']) },
    teacherController.getTeacherById
  );

  fastify.get('/:id', teacherController.getTeacherById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'TEACH', 'TEACHERS'], ['C']) },
    teacherController.createTeacher
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'TEACH', 'TEACHERS'], ['U']) },
    teacherController.updateTeacher
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'TEACH', 'TEACHERS'], ['D']) },
    teacherController.deleteTeacher
  );
}
