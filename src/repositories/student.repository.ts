import Student from '../models/student.model';
import User from '../models/user.model';
import Client from '../models/client.model';
import Teacher from '../models/teacher.model';
import { Op, Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class StudentRepository {
  async findById(id: string, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'StudentRepository: finding student by ID');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    return Student.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] },
          required: false,
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'orgn_details', 'status'],
          required: false,
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'first_name', 'last_name', 'employee_id', 'specialization', 'phone', 'email'],
          required: false,
        },
      ],
      transaction,
    });
  }

  async findByEnrollmentNumber(enrollment_number: string, client_id: string, transaction?: Transaction) {
    logger.info({ enrollment_number, client_id }, 'StudentRepository: finding student by enrollment number');
    return Student.findOne({
      where: {
        enrollment_number,
        client_id,
        is_deleted: false,
      },
      transaction,
    });
  }

  async findByEmailOrPhone(email?: string, phone?: string, client_id?: string, transaction?: Transaction) {
    logger.info({ email, phone, client_id }, 'StudentRepository: finding student by email or phone');
    const orConditions: any[] = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    if (orConditions.length === 0) return null;

    const where: any = {
      is_deleted: false,
      [Op.or]: orConditions,
    };
    if (client_id) {
      where.client_id = client_id;
    }

    return Student.findOne({
      where,
      transaction,
    });
  }

  async findAndCountAll(options: {
    whereCondition: any;
    limit: number;
    offset: number;
    order?: any[];
  }) {
    logger.info({ options }, 'StudentRepository: finding and counting students');
    return Student.findAndCountAll({
      where: options.whereCondition,
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] },
          required: false,
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'orgn_details', 'status'],
          required: false,
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'first_name', 'last_name', 'employee_id', 'specialization', 'phone', 'email'],
          required: false,
        },
      ],
      distinct: true,
    });
  }

  async create(studentData: any, transaction?: Transaction) {
    logger.info(
      { client_id: studentData.client_id, enrollment_number: studentData.enrollment_number },
      'StudentRepository: creating student'
    );
    return Student.create(studentData, { transaction });
  }

  async update(id: string, updateData: any, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'StudentRepository: updating student');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Student.update(updateData, {
      where,
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, client_id?: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, client_id, updatedBy }, 'StudentRepository: soft deleting student');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Student.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where, transaction }
    );
    return affectedCount;
  }
}

export default new StudentRepository();
