import { FastifyRequest, FastifyReply } from 'fastify';
import attendanceService from '../services/attendance.service';
import Student from '../models/student.model';
import {
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
  BulkAttendanceRequest,
  GetAttendanceQuery,
} from '../interfaces/attendance.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class AttendanceController {
  async getAllAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetAttendanceQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'AttendanceController.getAllAttendance: request received');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      // If a student user is logged in, auto-filter to their student_id if not explicitly provided
      const userType = request.user?.user_type?.toLowerCase().replace(/[\s_-]/g, '');
      if (userType === 'student' && !query.student_id && request.user?.user_id) {
        const student = await Student.findOne({
          where: { user_id: request.user.user_id, client_id, is_deleted: false },
        });
        if (student) {
          query.student_id = student.id;
        }
      }

      const result = await attendanceService.getAllAttendance(
        client_id,
        query,
        page,
        limit,
        offset
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.getAllAttendance: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getAttendanceById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const attendance_id = id || (request.params as any).attendance_id;

      logger.info({ client_id, attendance_id }, 'AttendanceController.getAttendanceById: request received');

      if (!attendance_id) {
        return reply.code(400).send({
          success: false,
          message: 'Attendance ID is required',
        });
      }

      const record = await attendanceService.getAttendanceById(attendance_id, client_id);
      if (!record) {
        return reply.code(404).send({
          success: false,
          message: 'Attendance record not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Attendance record fetched successfully',
        attendance: record,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.getAttendanceById: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const data = request.body as CreateAttendanceRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, data, loggedInUserId },
        'AttendanceController.createAttendance: request received'
      );

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!data || !data.user_type || !data.date || !data.status) {
        return reply.code(400).send({
          success: false,
          message: 'user_type (student/teacher), date, and status are required',
        });
      }

      const result = await attendanceService.createAttendance(
        client_id,
        data,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.createAttendance: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async markBulkAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const bulkData = request.body as BulkAttendanceRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, user_type: bulkData?.user_type, date: bulkData?.date, count: bulkData?.records?.length },
        'AttendanceController.markBulkAttendance: request received'
      );

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!bulkData || !bulkData.user_type || !bulkData.date || !Array.isArray(bulkData.records)) {
        return reply.code(400).send({
          success: false,
          message: 'user_type, date, and records array are required',
        });
      }

      const result = await attendanceService.markBulkAttendance(
        client_id,
        bulkData,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.markBulkAttendance: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const data = request.body as UpdateAttendanceRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, data, loggedInUserId },
        'AttendanceController.updateAttendance: request received'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await attendanceService.updateAttendance(
        id,
        client_id,
        data,
        loggedInUserId
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.updateAttendance: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info(
        { client_id, id, loggedInUserId },
        'AttendanceController.deleteAttendance: request received'
      );

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await attendanceService.deleteAttendance(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.deleteAttendance: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getAttendanceSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const { date, user_type, class_id } = request.query as {
        date?: string;
        user_type?: any;
        class_id?: string;
      };

      logger.info({ client_id, date, user_type, class_id }, 'AttendanceController.getAttendanceSummary: request received');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const targetDate = date || new Date().toISOString().split('T')[0];
      const result = await attendanceService.getAttendanceSummary(
        client_id,
        targetDate,
        user_type,
        class_id
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.getAttendanceSummary: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getTodayAttendance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as { student_id?: string };
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, query, loggedInUserId }, 'AttendanceController.getTodayAttendance: request received');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await attendanceService.getTodayAttendance(
        client_id,
        loggedInUserId,
        query?.student_id
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'AttendanceController.getTodayAttendance: error');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new AttendanceController();
