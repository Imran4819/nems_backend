import Attendance from '../models/attendance.model';
import Student from '../models/student.model';
import Teacher from '../models/teacher.model';
import ClassModel from '../models/class.model';
import Subject from '../models/subject.model';
import Client from '../models/client.model';
import {
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
  BulkAttendanceRequest,
  GetAttendanceQuery,
  AttendanceUserType,
} from '../interfaces/attendance.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import { Op } from 'sequelize';
import attendanceRepository from '../repositories/attendance.repository';

export class AttendanceService {
  async getAllAttendance(
    client_id: string,
    query: GetAttendanceQuery,
    page: number = 1,
    limit: number = 10,
    offset: number = 0
  ) {
    logger.info(
      { client_id, page, limit, query },
      'AttendanceService.getAllAttendance: fetching attendance list'
    );

    try {
      const whereCondition: any = {
        client_id,
        is_deleted: false,
      };

      if (query.user_type) {
        whereCondition.user_type = query.user_type;
      }

      if (query.student_id) {
        whereCondition.student_id = query.student_id;
      }

      if (query.teacher_id) {
        whereCondition.teacher_id = query.teacher_id;
      }

      if (query.class_id) {
        whereCondition.class_id = query.class_id;
      }

      if (query.subject_id) {
        whereCondition.subject_id = query.subject_id;
      }

      if (query.status) {
        whereCondition.status = query.status;
      }

      if (query.date) {
        if (typeof query.date === 'string' && query.date.toLowerCase() === 'today') {
          whereCondition.date = new Date().toISOString().split('T')[0];
        } else {
          whereCondition.date = query.date;
        }
      } else if (query.start_date && query.end_date) {
        whereCondition.date = {
          [Op.between]: [query.start_date, query.end_date],
        };
      } else if (query.start_date) {
        whereCondition.date = { [Op.gte]: query.start_date };
      } else if (query.end_date) {
        whereCondition.date = { [Op.lte]: query.end_date };
      }

      const { count, rows } = await attendanceRepository.findAndCountAll({
        whereCondition,
        limit,
        offset,
      });

      logger.info(
        { client_id, total: count, fetched: rows.length },
        'AttendanceService.getAllAttendance: attendance records fetched successfully'
      );

      return {
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'AttendanceService.getAllAttendance: error fetching attendance');
      throw error;
    }
  }

  async getAttendanceById(id: string, client_id?: string) {
    logger.info({ id, client_id }, 'AttendanceService.getAttendanceById: fetching attendance record');

    try {
      const record = await attendanceRepository.findById(id, client_id);
      if (!record) {
        logger.warn({ id, client_id }, 'AttendanceService.getAttendanceById: attendance not found');
        return null;
      }

      logger.info({ id }, 'AttendanceService.getAttendanceById: record fetched successfully');
      return record;
    } catch (error) {
      logger.error({ err: error, id }, 'AttendanceService.getAttendanceById: error fetching record');
      throw error;
    }
  }

  async createAttendance(client_id: string, data: CreateAttendanceRequest, created_by?: string) {
    logger.info(
      { client_id, user_type: data.user_type, date: data.date, status: data.status },
      'AttendanceService.createAttendance: creating or updating attendance record'
    );
    const trx = await getSequelize().transaction();

    try {
      // 1. Verify Client
      const client = await Client.findOne({
        where: { id: client_id, is_deleted: false },
        transaction: trx,
      });

      if (!client) {
        await trx.rollback();
        return { success: false, message: 'Client does not exist' };
      }

      // 2. Validate Student or Teacher
      if (data.user_type === 'student') {
        if (!data.student_id) {
          await trx.rollback();
          return { success: false, message: 'student_id is required when user_type is student' };
        }
        const student = await Student.findOne({
          where: { id: data.student_id, client_id, is_deleted: false },
          transaction: trx,
        });
        if (!student) {
          await trx.rollback();
          return { success: false, message: 'Student does not exist in this organization' };
        }
      } else if (data.user_type === 'teacher') {
        if (!data.teacher_id) {
          await trx.rollback();
          return { success: false, message: 'teacher_id is required when user_type is teacher' };
        }
        const teacher = await Teacher.findOne({
          where: { id: data.teacher_id, client_id, is_deleted: false },
          transaction: trx,
        });
        if (!teacher) {
          await trx.rollback();
          return { success: false, message: 'Teacher does not exist in this organization' };
        }
      }

      // 3. Validate Class if provided
      if (data.class_id) {
        const classItem = await ClassModel.findOne({
          where: { id: data.class_id, client_id, is_deleted: false },
          transaction: trx,
        });
        if (!classItem) {
          await trx.rollback();
          return { success: false, message: 'Class does not exist in this organization' };
        }
      }

      // 4. Validate Subject if provided
      if (data.subject_id) {
        const subject = await Subject.findOne({
          where: { id: data.subject_id, client_id, is_deleted: false },
          transaction: trx,
        });
        if (!subject) {
          await trx.rollback();
          return { success: false, message: 'Subject does not exist in this organization' };
        }
      }

      const entityId = data.user_type === 'student' ? data.student_id! : data.teacher_id!;

      // 5. Check if attendance already marked for this date (Upsert)
      const existing = await attendanceRepository.findByDateAndEntity(
        client_id,
        data.date,
        data.user_type,
        entityId,
        data.class_id,
        data.subject_id,
        trx
      );

      let recordId: string;

      if (existing) {
        logger.info({ id: existing.id }, 'Existing attendance found for date. Updating record...');
        await existing.update(
          {
            status: data.status,
            check_in_time: data.check_in_time !== undefined ? data.check_in_time : existing.check_in_time,
            check_out_time: data.check_out_time !== undefined ? data.check_out_time : existing.check_out_time,
            late_minutes: data.late_minutes !== undefined ? data.late_minutes : existing.late_minutes,
            marked_by: created_by || existing.marked_by,
            remark: data.remark !== undefined ? data.remark : existing.remark,
            metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
            updated_by: created_by || null,
            updated_at: new Date(),
          },
          { transaction: trx }
        );
        recordId = existing.id;
      } else {
        const newRecord = await attendanceRepository.create(
          {
            client_id,
            user_type: data.user_type,
            student_id: data.user_type === 'student' ? data.student_id : null,
            teacher_id: data.user_type === 'teacher' ? data.teacher_id : null,
            class_id: data.class_id || null,
            subject_id: data.subject_id || null,
            date: data.date,
            status: data.status,
            check_in_time: data.check_in_time || null,
            check_out_time: data.check_out_time || null,
            late_minutes: data.late_minutes || null,
            marked_by: created_by || null,
            remark: data.remark || null,
            metadata: data.metadata || null,
            created_by: created_by || null,
            updated_by: created_by || null,
          },
          trx
        );
        recordId = newRecord.id;
      }

      await trx.commit();
      logger.info({ recordId }, 'AttendanceService.createAttendance: attendance marked successfully');

      const fullRecord = await this.getAttendanceById(recordId, client_id);
      return {
        success: true,
        message: existing ? 'Attendance updated successfully' : 'Attendance marked successfully',
        attendance: fullRecord,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'AttendanceService.createAttendance: error');
      throw error;
    }
  }

  async markBulkAttendance(client_id: string, bulkData: BulkAttendanceRequest, created_by?: string) {
    logger.info(
      { client_id, user_type: bulkData.user_type, count: bulkData.records.length, date: bulkData.date },
      'AttendanceService.markBulkAttendance: marking bulk attendance'
    );
    const trx = await getSequelize().transaction();

    try {
      const client = await Client.findOne({
        where: { id: client_id, is_deleted: false },
        transaction: trx,
      });

      if (!client) {
        await trx.rollback();
        return { success: false, message: 'Client does not exist' };
      }

      let createdCount = 0;
      let updatedCount = 0;

      for (const item of bulkData.records) {
        const entityId = bulkData.user_type === 'student' ? item.student_id : item.teacher_id;
        if (!entityId) continue;

        const existing = await attendanceRepository.findByDateAndEntity(
          client_id,
          bulkData.date,
          bulkData.user_type,
          entityId,
          bulkData.class_id,
          bulkData.subject_id,
          trx
        );

        if (existing) {
          await existing.update(
            {
              status: item.status,
              check_in_time: item.check_in_time !== undefined ? item.check_in_time : existing.check_in_time,
              check_out_time: item.check_out_time !== undefined ? item.check_out_time : existing.check_out_time,
              late_minutes: item.late_minutes !== undefined ? item.late_minutes : existing.late_minutes,
              remark: item.remark !== undefined ? item.remark : existing.remark,
              marked_by: created_by || existing.marked_by,
              updated_by: created_by || null,
              updated_at: new Date(),
            },
            { transaction: trx }
          );
          updatedCount++;
        } else {
          await attendanceRepository.create(
            {
              client_id,
              user_type: bulkData.user_type,
              student_id: bulkData.user_type === 'student' ? item.student_id : null,
              teacher_id: bulkData.user_type === 'teacher' ? item.teacher_id : null,
              class_id: bulkData.class_id || null,
              subject_id: bulkData.subject_id || null,
              date: bulkData.date,
              status: item.status,
              check_in_time: item.check_in_time || null,
              check_out_time: item.check_out_time || null,
              late_minutes: item.late_minutes || null,
              marked_by: created_by || null,
              remark: item.remark || null,
              created_by: created_by || null,
              updated_by: created_by || null,
            },
            trx
          );
          createdCount++;
        }
      }

      await trx.commit();
      logger.info(
        { client_id, createdCount, updatedCount, total: bulkData.records.length },
        'AttendanceService.markBulkAttendance: bulk attendance completed'
      );

      return {
        success: true,
        message: 'Bulk attendance submitted successfully',
        summary: {
          totalSubmitted: bulkData.records.length,
          created: createdCount,
          updated: updatedCount,
          date: bulkData.date,
          user_type: bulkData.user_type,
        },
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'AttendanceService.markBulkAttendance: error');
      throw error;
    }
  }

  async updateAttendance(
    id: string,
    client_id: string,
    updateData: UpdateAttendanceRequest,
    updated_by?: string
  ) {
    logger.info({ id, client_id, updateData }, 'AttendanceService.updateAttendance: updating attendance');
    const trx = await getSequelize().transaction();

    try {
      const record = await Attendance.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!record) {
        await trx.rollback();
        return { success: false, message: 'Attendance record not found' };
      }

      const updates: any = {
        updated_by: updated_by || null,
        updated_at: new Date(),
      };

      if (updateData.status) updates.status = updateData.status;
      if (updateData.check_in_time !== undefined) updates.check_in_time = updateData.check_in_time;
      if (updateData.check_out_time !== undefined) updates.check_out_time = updateData.check_out_time;
      if (updateData.late_minutes !== undefined) updates.late_minutes = updateData.late_minutes;
      if (updateData.remark !== undefined) updates.remark = updateData.remark;
      if (updateData.metadata !== undefined) updates.metadata = updateData.metadata;

      await record.update(updates, { transaction: trx });

      await trx.commit();
      logger.info({ id, client_id }, 'AttendanceService.updateAttendance: updated successfully');

      const updated = await this.getAttendanceById(id, client_id);
      return {
        success: true,
        message: 'Attendance record updated successfully',
        attendance: updated,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'AttendanceService.updateAttendance: error');
      throw error;
    }
  }

  async deleteAttendance(id: string, client_id: string, updated_by?: string) {
    logger.info({ id, client_id, updated_by }, 'AttendanceService.deleteAttendance: deleting attendance');
    const trx = await getSequelize().transaction();

    try {
      const record = await Attendance.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!record) {
        await trx.rollback();
        return { success: false, message: 'Attendance record not found' };
      }

      await record.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ id, client_id }, 'AttendanceService.deleteAttendance: deleted successfully');

      return {
        success: true,
        message: 'Attendance record deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'AttendanceService.deleteAttendance: error');
      throw error;
    }
  }

  async getAttendanceSummary(
    client_id: string,
    date: string,
    user_type?: AttendanceUserType,
    class_id?: string
  ) {
    logger.info({ client_id, date, user_type, class_id }, 'AttendanceService.getAttendanceSummary: fetching summary');
    try {
      const summary = await attendanceRepository.getSummary(client_id, date, user_type, class_id);
      const presentRate = summary.total > 0
        ? Math.round(((summary.present + summary.late + summary.half_day) / summary.total) * 100)
        : 0;

      return {
        success: true,
        date,
        user_type: user_type || 'all',
        class_id: class_id || null,
        summary: {
          ...summary,
          attendance_percentage: `${presentRate}%`,
        },
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'AttendanceService.getAttendanceSummary: error');
      throw error;
    }
  }

  async getTodayAttendance(client_id: string, user_id?: string, student_id?: string) {
    logger.info({ client_id, user_id, student_id }, 'AttendanceService.getTodayAttendance: fetching today attendance');

    const today = new Date().toISOString().split('T')[0];
    let targetStudentId = student_id;

    if (!targetStudentId && user_id) {
      const student = await Student.findOne({
        where: { user_id, client_id, is_deleted: false },
      });
      if (student) {
        targetStudentId = student.id;
      }
    }

    if (!targetStudentId) {
      return {
        success: false,
        date: today,
        is_marked: false,
        is_present: false,
        status: 'not_found',
        message: 'Student record could not be found for the current user in this organization',
      };
    }

    const attendanceRecord = await Attendance.findOne({
      where: {
        client_id,
        student_id: targetStudentId,
        date: today,
        is_deleted: false,
      },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name', 'roll_number', 'enrollment_number'] },
        { model: ClassModel, as: 'class', attributes: ['id', 'name', 'division'] },
      ],
    });

    const isMarked = !!attendanceRecord;
    const status = attendanceRecord ? attendanceRecord.status : 'not_marked';
    const isPresent = status === 'present';

    return {
      success: true,
      date: today,
      is_marked: isMarked,
      is_present: isPresent,
      status,
      attendance: attendanceRecord,
      message: isMarked
        ? `Student is marked as ${status.toUpperCase()} today (${today})`
        : `Student attendance has not been marked yet for today (${today})`,
    };
  }
}

export default new AttendanceService();
