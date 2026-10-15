import Timetable from '../models/timetable.model';
import ClassModel from '../models/class.model';
import Subject from '../models/subject.model';
import Teacher from '../models/teacher.model';
import Client from '../models/client.model';
import {
  CreateTimetableRequest,
  UpdateTimetableRequest,
  GetTimetableQuery,
} from '../interfaces/timetable.interface';
import logger from '../plugins/logger-plugins';
import { Op } from 'sequelize';

export class TimetableService {
  async getAllTimetables(
    client_id: string,
    query: GetTimetableQuery = {},
    page: number = 1,
    limit: number = 20,
    offset: number = 0
  ) {
    logger.info({ client_id, query }, 'TimetableService.getAllTimetables: fetching list');

    try {
      const whereCondition: any = {
        client_id,
        is_deleted: false,
      };

      if (query.class_id) whereCondition.class_id = query.class_id;
      if (query.section) whereCondition.section = query.section;
      if (query.section_id) whereCondition.section_id = query.section_id;
      if (query.day_of_week) whereCondition.day_of_week = query.day_of_week;
      if (query.period) whereCondition.period = String(query.period);
      if (query.subject_id) whereCondition.subject_id = query.subject_id;
      if (query.teacher_id) whereCondition.teacher_id = query.teacher_id;
      if (query.academic_year) whereCondition.academic_year = query.academic_year;
      if (query.academic_year_id) whereCondition.academic_year_id = query.academic_year_id;
      if (query.is_active !== undefined) {
        whereCondition.is_active = query.is_active === true || query.is_active === 'true';
      }

      const { count, rows } = await Timetable.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [
          ['day_of_week', 'ASC'],
          ['period', 'ASC'],
          ['start_time', 'ASC'],
        ],
        include: [
          {
            model: ClassModel,
            as: 'class',
            attributes: ['id', 'name', 'division', 'academic_year', 'room_number'],
          },
          {
            model: Subject,
            as: 'subject',
            attributes: ['id', 'name', 'code', 'credits'],
          },
          {
            model: Teacher,
            as: 'teacher',
            attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email', 'phone'],
          },
        ],
      });

      return {
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'TimetableService.getAllTimetables: error');
      throw error;
    }
  }

  async getTimetableById(id: string, client_id?: string) {
    logger.info({ id, client_id }, 'TimetableService.getTimetableById: fetching details');

    try {
      const whereCondition: any = { id, is_deleted: false };
      if (client_id) whereCondition.client_id = client_id;

      const record = await Timetable.findOne({
        where: whereCondition,
        include: [
          {
            model: ClassModel,
            as: 'class',
            attributes: ['id', 'name', 'division', 'academic_year', 'room_number'],
          },
          {
            model: Subject,
            as: 'subject',
            attributes: ['id', 'name', 'code', 'credits'],
          },
          {
            model: Teacher,
            as: 'teacher',
            attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email', 'phone'],
          },
        ],
      });

      return record;
    } catch (error) {
      logger.error({ err: error, id }, 'TimetableService.getTimetableById: error');
      throw error;
    }
  }

  async createTimetable(
    client_id: string,
    data: CreateTimetableRequest,
    created_by?: string
  ) {
    logger.info({ client_id, data }, 'TimetableService.createTimetable: creating schedule');

    try {
      // 1. Verify Client
      const client = await Client.findOne({ where: { id: client_id, is_deleted: false } });
      if (!client) {
        return { success: false, message: 'Client does not exist' };
      }

      // 2. Verify Class
      const classRecord = await ClassModel.findOne({
        where: { id: data.class_id, client_id, is_deleted: false },
      });
      if (!classRecord) {
        return { success: false, message: `Class with ID '${data.class_id}' does not exist` };
      }

      // 3. Verify Subject
      const subjectRecord = await Subject.findOne({
        where: { id: data.subject_id, client_id, is_deleted: false },
      });
      if (!subjectRecord) {
        return { success: false, message: `Subject with ID '${data.subject_id}' does not exist` };
      }

      // 4. Verify Teacher
      const teacherRecord = await Teacher.findOne({
        where: { id: data.teacher_id, client_id, is_deleted: false },
      });
      if (!teacherRecord) {
        return { success: false, message: `Teacher with ID '${data.teacher_id}' does not exist` };
      }

      // 5. Create Timetable record
      const newTimetable = await Timetable.create({
        client_id,
        academic_year_id: data.academic_year_id || null,
        academic_year: data.academic_year || classRecord.academic_year || null,
        class_id: data.class_id,
        section_id: data.section_id || null,
        section: data.section || classRecord.division || null,
        day_of_week: data.day_of_week,
        period_id: data.period_id || null,
        period: data.period ? String(data.period) : null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        subject_id: data.subject_id,
        teacher_id: data.teacher_id,
        room_number: data.room_number || classRecord.room_number || null,
        is_active: data.is_active ?? true,
        metadata: data.metadata || null,
        created_by: created_by || null,
        updated_by: created_by || null,
      });

      const fullRecord = await this.getTimetableById(newTimetable.id, client_id);

      return {
        success: true,
        message: 'Timetable schedule created successfully',
        data: fullRecord,
      };
    } catch (error: any) {
      logger.error({ err: error, client_id }, 'TimetableService.createTimetable: error');
      throw error;
    }
  }

  async updateTimetable(
    id: string,
    client_id: string,
    data: UpdateTimetableRequest,
    updated_by?: string
  ) {
    logger.info({ id, client_id, data }, 'TimetableService.updateTimetable: updating schedule');

    try {
      const timetable = await Timetable.findOne({
        where: { id, client_id, is_deleted: false },
      });

      if (!timetable) {
        return { success: false, message: 'Timetable entry not found' };
      }

      await timetable.update({
        ...data,
        period: data.period !== undefined ? String(data.period) : timetable.period,
        updated_by: updated_by || null,
        updated_at: new Date(),
      });

      const updatedRecord = await this.getTimetableById(id, client_id);

      return {
        success: true,
        message: 'Timetable entry updated successfully',
        data: updatedRecord,
      };
    } catch (error) {
      logger.error({ err: error, id }, 'TimetableService.updateTimetable: error');
      throw error;
    }
  }

  async deleteTimetable(id: string, client_id: string, updated_by?: string) {
    logger.info({ id, client_id }, 'TimetableService.deleteTimetable: deleting schedule');

    try {
      const timetable = await Timetable.findOne({
        where: { id, client_id, is_deleted: false },
      });

      if (!timetable) {
        return { success: false, message: 'Timetable entry not found' };
      }

      await timetable.update({
        is_deleted: true,
        updated_by: updated_by || null,
        updated_at: new Date(),
      });

      return {
        success: true,
        message: 'Timetable entry deleted successfully',
      };
    } catch (error) {
      logger.error({ err: error, id }, 'TimetableService.deleteTimetable: error');
      throw error;
    }
  }
}

export default new TimetableService();
