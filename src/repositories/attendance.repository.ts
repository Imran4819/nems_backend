import Attendance from '../models/attendance.model';
import Student from '../models/student.model';
import Teacher from '../models/teacher.model';
import ClassModel from '../models/class.model';
import Subject from '../models/subject.model';
import Client from '../models/client.model';
import { Transaction, Op, fn, col } from 'sequelize';
import logger from '../plugins/logger-plugins';
import { AttendanceUserType } from '../interfaces/attendance.interface';

export class AttendanceRepository {
  async findById(id: string, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'AttendanceRepository: finding attendance by ID');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    return Attendance.findOne({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'enrollment_number', 'first_name', 'last_name', 'roll_number', 'class_name', 'division'],
          required: false,
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'employee_id', 'first_name', 'last_name', 'specialization'],
          required: false,
        },
        {
          model: ClassModel,
          as: 'class',
          attributes: ['id', 'name', 'code', 'division'],
          required: false,
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code'],
          required: false,
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'orgn_details', 'status'],
          required: false,
        },
      ],
      transaction,
    });
  }

  async findByDateAndEntity(
    client_id: string,
    date: string | Date,
    user_type: AttendanceUserType,
    entity_id: string,
    class_id?: string | null,
    subject_id?: string | null,
    transaction?: Transaction
  ) {
    logger.info(
      { client_id, date, user_type, entity_id, class_id, subject_id },
      'AttendanceRepository: finding existing attendance for entity on date'
    );

    const where: any = {
      client_id,
      date,
      user_type,
      is_deleted: false,
    };

    if (user_type === 'student') {
      where.student_id = entity_id;
    } else {
      where.teacher_id = entity_id;
    }

    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;

    return Attendance.findOne({ where, transaction });
  }

  async findAndCountAll(options: {
    whereCondition: any;
    limit: number;
    offset: number;
    order?: any[];
  }) {
    logger.info({ options }, 'AttendanceRepository: finding and counting attendance records');
    return Attendance.findAndCountAll({
      where: options.whereCondition,
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['date', 'DESC'], ['created_at', 'DESC']],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'enrollment_number', 'first_name', 'last_name', 'roll_number', 'class_name', 'division'],
          required: false,
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'employee_id', 'first_name', 'last_name', 'specialization'],
          required: false,
        },
        {
          model: ClassModel,
          as: 'class',
          attributes: ['id', 'name', 'code', 'division'],
          required: false,
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code'],
          required: false,
        },
      ],
      distinct: true,
    });
  }

  async create(attendanceData: any, transaction?: Transaction) {
    logger.info(
      { client_id: attendanceData.client_id, user_type: attendanceData.user_type, date: attendanceData.date },
      'AttendanceRepository: creating attendance record'
    );
    return Attendance.create(attendanceData, { transaction });
  }

  async bulkCreate(records: any[], options?: any) {
    logger.info({ count: records.length }, 'AttendanceRepository: bulk creating attendance records');
    return Attendance.bulkCreate(records, options);
  }

  async update(id: string, updateData: any, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'AttendanceRepository: updating attendance');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Attendance.update(updateData, {
      where,
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, client_id?: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, client_id, updatedBy }, 'AttendanceRepository: soft deleting attendance');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Attendance.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where, transaction }
    );
    return affectedCount;
  }

  async getSummary(client_id: string, date: string, user_type?: AttendanceUserType, class_id?: string) {
    logger.info({ client_id, date, user_type, class_id }, 'AttendanceRepository: generating attendance summary');
    const where: any = {
      client_id,
      date,
      is_deleted: false,
    };

    if (user_type) where.user_type = user_type;
    if (class_id) where.class_id = class_id;

    const counts = await Attendance.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      where,
      group: ['status'],
      raw: true,
    });

    const summary: Record<string, number> = {
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
      excused: 0,
      on_leave: 0,
      total: 0,
    };

    counts.forEach((item: any) => {
      const statusKey = item.status;
      const countVal = parseInt(item.count, 10) || 0;
      summary[statusKey] = countVal;
      summary.total += countVal;
    });

    return summary;
  }
}

export default new AttendanceRepository();
