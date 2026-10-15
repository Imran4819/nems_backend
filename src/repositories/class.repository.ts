import ClassModel from '../models/class.model';
import Teacher from '../models/teacher.model';
import Client from '../models/client.model';
import Subject from '../models/subject.model';
import { Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class ClassRepository {
  async findById(id: string, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'ClassRepository: finding class by ID');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    return ClassModel.findOne({
      where,
      include: [
        {
          model: Teacher,
          as: 'class_teacher',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id', 'specialization'],
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
      ],
      transaction,
    });
  }

  async findByCode(code: string, client_id: string, transaction?: Transaction) {
    logger.info({ code, client_id }, 'ClassRepository: finding class by code');
    return ClassModel.findOne({
      where: {
        code,
        client_id,
        is_deleted: false,
      },
      transaction,
    });
  }

  async findAndCountAll(options: {
    whereCondition: any;
    limit: number;
    offset: number;
    order?: any[];
  }) {
    logger.info({ options }, 'ClassRepository: finding and counting classes');
    return ClassModel.findAndCountAll({
      where: options.whereCondition,
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['created_at', 'DESC']],
      include: [
        {
          model: Teacher,
          as: 'class_teacher',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id'],
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

  async create(classData: any, transaction?: Transaction) {
    logger.info(
      { client_id: classData.client_id, name: classData.name, division: classData.division },
      'ClassRepository: creating class'
    );
    return ClassModel.create(classData, { transaction });
  }

  async update(id: string, updateData: any, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'ClassRepository: updating class');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await ClassModel.update(updateData, {
      where,
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, client_id?: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, client_id, updatedBy }, 'ClassRepository: soft deleting class');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await ClassModel.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where, transaction }
    );
    return affectedCount;
  }
}

export default new ClassRepository();
