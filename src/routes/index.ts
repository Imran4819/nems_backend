import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import authRoutes from './auth.route';
import clientRoutes from './client.route';
import roleRoutes from './role.route';
import userRoutes from './user.route';
import studentRoutes from './student.route';
import teacherRoutes from './teacher.route';
import classRoutes from './class.route';
import subjectRoutes from './subject.route';
import attendanceRoutes from './attendance.route';
import timetableRoutes from './timetable.route';
import logger from '../plugins/logger-plugins';

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    logger.debug('Health check endpoint requested');
    return {
      status: 'ok',
      service: 'Nems Backend API',
      timestamp: new Date().toISOString(),
    };
  });

  // Register feature routes
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(clientRoutes, { prefix: '/clients' });
  fastify.register(roleRoutes, { prefix: '/roles' });
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(studentRoutes, { prefix: '/students' });
  fastify.register(teacherRoutes, { prefix: '/teachers' });
  fastify.register(classRoutes, { prefix: '/classes' });
  fastify.register(subjectRoutes, { prefix: '/subjects' });
  fastify.register(attendanceRoutes, { prefix: '/attendance' });
  fastify.register(timetableRoutes, { prefix: '/timetables' });

  logger.info(
    'API route modules registered: /auth, /clients, /roles, /users, /students, /teachers, /classes, /subjects, /attendance, /timetables'
  );
}

