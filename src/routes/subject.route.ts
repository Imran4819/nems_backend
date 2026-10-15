import { FastifyInstance } from 'fastify';
import subjectController from '../controllers/subject.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function subjectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Subject CRUD routes
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'SUBJ', 'SUBJECTS'], ['R']) },
    subjectController.getAllSubjects
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'SUBJ', 'SUBJECTS'], ['R']) },
    subjectController.getSubjectById
  );

  fastify.get('/:id', subjectController.getSubjectById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'SUBJ', 'SUBJECTS'], ['C']) },
    subjectController.createSubject
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'SUBJ', 'SUBJECTS'], ['U']) },
    subjectController.updateSubject
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'SUBJ', 'SUBJECTS'], ['D']) },
    subjectController.deleteSubject
  );
}
