import { FastifyRequest, FastifyReply } from 'fastify';
import subjectService from '../services/subject.service';
import {
  CreateSubjectRequest,
  UpdateSubjectRequest,
  GetSubjectsQuery,
} from '../interfaces/subject.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class SubjectController {
  async getAllSubjects(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetSubjectsQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'SubjectController.getAllSubjects: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await subjectService.getAllSubjects(
        client_id,
        page,
        limit,
        offset,
        query.k,
        query.class_id,
        query.teacher_id,
        query.status,
        query.is_elective
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'SubjectController.getAllSubjects: error fetching subjects');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getSubjectById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const subject_id = id || (request.params as any).subject_id;

      logger.info({ client_id, subject_id }, 'SubjectController.getSubjectById: received request');

      if (!subject_id) {
        return reply.code(400).send({
          success: false,
          message: 'Subject ID is required',
        });
      }

      const subject = await subjectService.getSubjectById(subject_id, client_id);
      if (!subject) {
        return reply.code(404).send({
          success: false,
          message: 'Subject not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Subject fetched successfully',
        subject,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'SubjectController.getSubjectById: error fetching subject');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createSubject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const subjectData = request.body as CreateSubjectRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, subjectData, loggedInUserId },
        'SubjectController.createSubject: received request'
      );

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!subjectData || !subjectData.name || !subjectData.code) {
        return reply.code(400).send({
          success: false,
          message: 'Subject name and code are required',
        });
      }

      const result = await subjectService.createSubject(
        client_id,
        subjectData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'SubjectController.createSubject: error creating subject');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateSubject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const subjectData = request.body as UpdateSubjectRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, subjectData, loggedInUserId },
        'SubjectController.updateSubject: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await subjectService.updateSubject(
        id,
        client_id,
        subjectData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'SubjectController.updateSubject: error updating subject');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteSubject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, loggedInUserId },
        'SubjectController.deleteSubject: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await subjectService.deleteSubject(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'SubjectController.deleteSubject: error deleting subject');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new SubjectController();
