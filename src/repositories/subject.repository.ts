import Subject from '../models/subject.model';
import Teacher from '../models/teacher.model';
import ClassModel from '../models/class.model';
import Client from '../models/client.model';
import { Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class SubjectRepository {
  async findById(id: string, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'SubjectRepository: finding subject by ID');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    return Subject.findOne({
      where,
      include: [
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id', 'specialization'],
          required: false,
        },
        {
          model: ClassModel,
          as: 'class',
          attributes: ['id', 'name', 'code', 'division', 'academic_year'],
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

  async findByCode(code: string, client_id: string, transaction?: Transaction) {
    logger.info({ code, client_id }, 'SubjectRepository: finding subject by code');
    return Subject.findOne({
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
    logger.info({ options }, 'SubjectRepository: finding and counting subjects');
    return Subject.findAndCountAll({
      where: options.whereCondition,
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['created_at', 'DESC']],
      include: [
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id'],
          required: false,
        },
        {
          model: ClassModel,
          as: 'class',
          attributes: ['id', 'name', 'code', 'division', 'academic_year'],
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

  async create(subjectData: any, transaction?: Transaction) {
    logger.info(
      { client_id: subjectData.client_id, code: subjectData.code, teacher_id: subjectData.teacher_id },
      'SubjectRepository: creating subject'
    );
    return Subject.create(subjectData, { transaction });
  }

  async update(id: string, updateData: any, client_id?: string, transaction?: Transaction) {
    logger.info({ id, client_id }, 'SubjectRepository: updating subject');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Subject.update(updateData, {
      where,
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, client_id?: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, client_id, updatedBy }, 'SubjectRepository: soft deleting subject');
    const where: any = { id, is_deleted: false };
    if (client_id) {
      where.client_id = client_id;
    }

    const [affectedCount] = await Subject.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where, transaction }
    );
    return affectedCount;
  }
}

export default new SubjectRepository();
