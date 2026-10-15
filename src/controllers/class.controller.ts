import { FastifyRequest, FastifyReply } from 'fastify';
import classService from '../services/class.service';
import {
  CreateClassRequest,
  UpdateClassRequest,
  GetClassesQuery,
} from '../interfaces/class.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class ClassController {
  async getAllClasses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetClassesQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'ClassController.getAllClasses: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await classService.getAllClasses(
        client_id,
        page,
        limit,
        offset,
        query.k,
        query.division,
        query.academic_year,
        query.status,
        query.class_teacher_id
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClassController.getAllClasses: error fetching classes');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getClassById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const class_id = id || (request.params as any).class_id;

      logger.info({ client_id, class_id }, 'ClassController.getClassById: received request');

      if (!class_id) {
        return reply.code(400).send({
          success: false,
          message: 'Class ID is required',
        });
      }

      const classItem = await classService.getClassById(class_id, client_id);
      if (!classItem) {
        return reply.code(404).send({
          success: false,
          message: 'Class not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Class fetched successfully',
        class: classItem,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'ClassController.getClassById: error fetching class');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const classData = request.body as CreateClassRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, classData, loggedInUserId },
        'ClassController.createClass: received request'
      );

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!classData || !classData.name) {
        return reply.code(400).send({
          success: false,
          message: 'Class name is required',
        });
      }

      const result = await classService.createClass(
        client_id,
        classData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClassController.createClass: error creating class');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const classData = request.body as UpdateClassRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, classData, loggedInUserId },
        'ClassController.updateClass: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await classService.updateClass(
        id,
        client_id,
        classData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClassController.updateClass: error updating class');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, loggedInUserId },
        'ClassController.deleteClass: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await classService.deleteClass(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClassController.deleteClass: error deleting class');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new ClassController();
