import { FastifyInstance } from 'fastify';
import attendanceController from '../controllers/attendance.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function attendanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Attendance summary
  fastify.get(
    '/client/:client_id/summary',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['R']) },
    attendanceController.getAttendanceSummary
  );

  // Today's attendance status (returns whether student is marked present/absent today)
  fastify.get(
    '/client/:client_id/today',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['R']) },
    attendanceController.getTodayAttendance
  );

  // Attendance CRUD routes
  fastify.get(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['R']) },
    attendanceController.getAllAttendance
  );

  fastify.get(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['R']) },
    attendanceController.getAttendanceById
  );

  fastify.get('/:id', attendanceController.getAttendanceById);

  fastify.post(
    '/client/:client_id',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['C']) },
    attendanceController.createAttendance
  );

  fastify.post(
    '/client/:client_id/bulk',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['C']) },
    attendanceController.markBulkAttendance
  );

  fastify.put(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['U']) },
    attendanceController.updateAttendance
  );

  fastify.delete(
    '/client/:client_id/:id',
    { preHandler: TokenService.checkPermission(['ATTEND', 'ACAD'], ['D']) },
    attendanceController.deleteAttendance
  );
}
