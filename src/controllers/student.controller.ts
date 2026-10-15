import { FastifyRequest, FastifyReply } from 'fastify';
import studentService from '../services/student.service';
import {
  CreateStudentRequest,
  UpdateStudentRequest,
  GetStudentsQuery,
} from '../interfaces/student.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class StudentController {
  async getAllStudents(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetStudentsQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'StudentController.getAllStudents: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await studentService.getAllStudents(
        client_id,
        page,
        limit,
        offset,
        query.k,
        query.status,
        query.class_name,
        query.division,
        query.academic_year,
        query.teacher_id
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'StudentController.getAllStudents: error fetching students');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getStudentById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const student_id = id || (request.params as any).student_id;

      logger.info({ client_id, student_id }, 'StudentController.getStudentById: received request');

      if (!student_id) {
        return reply.code(400).send({
          success: false,
          message: 'Student ID is required',
        });
      }

      const student = await studentService.getStudentById(student_id, client_id);
      if (!student) {
        return reply.code(404).send({
          success: false,
          message: 'Student not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Student fetched successfully',
        student,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'StudentController.getStudentById: error fetching student');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createStudent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const studentData = request.body as CreateStudentRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, studentData, loggedInUserId },
        'StudentController.createStudent: received request'
      );

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (
        !studentData ||
        !studentData.enrollment_number ||
        !studentData.first_name ||
        !studentData.last_name ||
        !studentData.email ||
        !studentData.phone
      ) {
        return reply.code(400).send({
          success: false,
          message: 'enrollment_number, first_name, last_name, email, and phone are required',
        });
      }

      const result = await studentService.createStudent(
        client_id,
        studentData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'StudentController.createStudent: error creating student');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateStudent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const studentData = request.body as UpdateStudentRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, studentData, loggedInUserId },
        'StudentController.updateStudent: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await studentService.updateStudent(
        id,
        client_id,
        studentData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'StudentController.updateStudent: error updating student');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteStudent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, loggedInUserId },
        'StudentController.deleteStudent: received request'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await studentService.deleteStudent(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'StudentController.deleteStudent: error deleting student');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new StudentController();
