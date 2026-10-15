import { FastifyInstance } from 'fastify';
import timetableController from '../controllers/timetable.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function timetableRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Timetable CRUD routes
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'SUBJ'], ['R']) },
    timetableController.getAllTimetables
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'SUBJ'], ['R']) },
    timetableController.getTimetableById
  );

  fastify.get('/:id', timetableController.getTimetableById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'SUBJ'], ['C']) },
    timetableController.createTimetable
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'SUBJ'], ['U']) },
    timetableController.updateTimetable
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ACAD', 'CLASS', 'SUBJ'], ['D']) },
    timetableController.deleteTimetable
  );
}
