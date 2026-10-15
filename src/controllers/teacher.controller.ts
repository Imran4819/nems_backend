import { FastifyRequest, FastifyReply } from 'fastify';
import teacherService from '../services/teacher.service';
import {
  CreateTeacherRequest,
  UpdateTeacherRequest,
  GetTeachersQuery,
} from '../interfaces/teacher.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class TeacherController {
  async getAllTeachers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetTeachersQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'TeacherController.getAllTeachers: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await teacherService.getAllTeachers(
        client_id,
        page,
        limit,
        offset,
        query.k,
        query.status,
        query.specialization,
        query.qualification
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TeacherController.getAllTeachers: error fetching teachers');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getTeacherById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const teacher_id = id || (request.params as any).teacher_id;

      logger.info({ client_id, teacher_id }, 'TeacherController.getTeacherById: received request');

      if (!teacher_id) {
        return reply.code(400).send({
          success: false,
          message: 'Teacher ID is required',
        });
      }

      const teacher = await teacherService.getTeacherById(teacher_id, client_id);
      if (!teacher) {
        return reply.code(404).send({
          success: false,
          message: 'Teacher not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Teacher fetched successfully',
        teacher,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'TeacherController.getTeacherById: error fetching teacher');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createTeacher(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const teacherData = request.body as CreateTeacherRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, teacherData, loggedInUserId },
        'TeacherController.createTeacher: received request'
      );

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (
        !teacherData ||
        !teacherData.employee_id ||
        !teacherData.first_name ||
        !teacherData.last_name ||
        !teacherData.email ||
        !teacherData.phone
      ) {
        return reply.code(400).send({
          success: false,
          message: 'employee_id, first_name, last_name, email, and phone are required',
        });
      }

      const result = await teacherService.createTeacher(
        client_id,
        teacherData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TeacherController.createTeacher: error creating teacher');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateTeacher(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const teacherData = request.body as UpdateTeacherRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, teacherData, loggedInUserId },
        'TeacherController.updateTeacher: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await teacherService.updateTeacher(
        id,
        client_id,
        teacherData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TeacherController.updateTeacher: error updating teacher');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteTeacher(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, loggedInUserId },
        'TeacherController.deleteTeacher: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await teacherService.deleteTeacher(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TeacherController.deleteTeacher: error deleting teacher');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new TeacherController();
