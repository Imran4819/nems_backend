import Teacher from '../models/teacher.model';
import User from '../models/user.model';
import Client from '../models/client.model';
import Subject from '../models/subject.model';
import ClassModel from '../models/class.model';
import { Op, Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class TeacherRepository {
  async findById(id: string, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'TeacherRepository: finding teacher by ID');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    return Teacher.findOne({
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
          model: Subject,
          as: 'subjects',
          where: { is_deleted: false },
          required: false,
        },
        {
          model: ClassModel,
          as: 'classes_taught',
          where: { is_deleted: false },
          required: false,
        },
      ],
      transaction,
    });
  }

  async findByEmployeeId(employee_id: string, client_id: string, transaction?: Transaction) {
    logger.info({ employee_id, client_id }, 'TeacherRepository: finding teacher by employee ID');
    return Teacher.findOne({
      where: {
        employee_id,
        client_id,
        is_deleted: false,
      },
      transaction,
    });
  }

  async findByEmailOrPhone(email?: string, phone?: string, client_id?: string, transaction?: Transaction) {
    logger.info({ email, phone, client_id }, 'TeacherRepository: finding teacher by email or phone');
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

    return Teacher.findOne({
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
    logger.info({ options }, 'TeacherRepository: finding and counting teachers');
    return Teacher.findAndCountAll({
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
      ],
      distinct: true,
    });
  }

  async create(teacherData: any, transaction?: Transaction) {
    logger.info(
      { client_id: teacherData.client_id, employee_id: teacherData.employee_id },
      'TeacherRepository: creating teacher'
    );
    return Teacher.create(teacherData, { transaction });
  }

  async update(id: string, updateData: any, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'TeacherRepository: updating teacher');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Teacher.update(updateData, {
      where,
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, client_id?: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, client_id, updatedBy }, 'TeacherRepository: soft deleting teacher');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Teacher.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where, transaction }
    );
    return affectedCount;
  }
}

export default new TeacherRepository();
