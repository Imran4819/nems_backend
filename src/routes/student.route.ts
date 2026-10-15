import { FastifyInstance } from 'fastify';
import studentController from '../controllers/student.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function studentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Student CRUD routes
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'STU', 'STUDENTS'], ['R']) },
    studentController.getAllStudents
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'STU', 'STUDENTS'], ['R']) },
    studentController.getStudentById
  );

  fastify.get('/:id', studentController.getStudentById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'STU', 'STUDENTS'], ['C']) },
    studentController.createStudent
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'STU', 'STUDENTS'], ['U']) },
    studentController.updateStudent
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'STU', 'STUDENTS'], ['D']) },
    studentController.deleteStudent
  );
}
