import { FastifyRequest, FastifyReply } from 'fastify';
import timetableService from '../services/timetable.service';
import {
  CreateTimetableRequest,
  UpdateTimetableRequest,
  GetTimetableQuery,
} from '../interfaces/timetable.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class TimetableController {
  async getAllTimetables(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetTimetableQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'TimetableController.getAllTimetables: request received');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await timetableService.getAllTimetables(
        client_id,
        query,
        page,
        limit,
        offset
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TimetableController.getAllTimetables: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getTimetableById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const timetable_id = id || (request.params as any).timetable_id;

      logger.info({ client_id, timetable_id }, 'TimetableController.getTimetableById: request received');

      if (!timetable_id) {
        return reply.code(400).send({
          success: false,
          message: 'Timetable ID is required',
        });
      }

      const record = await timetableService.getTimetableById(timetable_id, client_id);
      if (!record) {
        return reply.code(404).send({
          success: false,
          message: 'Timetable schedule not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Timetable schedule fetched successfully',
        data: record,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'TimetableController.getTimetableById: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createTimetable(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const data = request.body as CreateTimetableRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, data, loggedInUserId }, 'TimetableController.createTimetable: request received');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!data || !data.class_id || !data.subject_id || !data.teacher_id || !data.day_of_week) {
        return reply.code(400).send({
          success: false,
          message: 'class_id, subject_id, teacher_id, and day_of_week are required',
        });
      }

      const result = await timetableService.createTimetable(client_id, data, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TimetableController.createTimetable: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateTimetable(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const data = request.body as UpdateTimetableRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, id, data, loggedInUserId }, 'TimetableController.updateTimetable: request received');

      if (!id || !client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id and timetable ID are required',
        });
      }

      const result = await timetableService.updateTimetable(id, client_id, data, loggedInUserId);
      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TimetableController.updateTimetable: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteTimetable(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, id, loggedInUserId }, 'TimetableController.deleteTimetable: request received');

      if (!id || !client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id and timetable ID are required',
        });
      }

      const result = await timetableService.deleteTimetable(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'TimetableController.deleteTimetable: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new TimetableController();
