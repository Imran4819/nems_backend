import ClassModel from '../models/class.model';
import Teacher from '../models/teacher.model';
import Client from '../models/client.model';
import { CreateClassRequest, UpdateClassRequest } from '../interfaces/class.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import { Op } from 'sequelize';
import classRepository from '../repositories/class.repository';

export class ClassService {
  async getAllClasses(
    client_id: string,
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    search?: string,
    division?: string,
    academic_year?: string,
    status?: string,
    class_teacher_id?: string
  ) {
    logger.info(
      { client_id, page, limit, search, division, academic_year, status, class_teacher_id },
      'ClassService.getAllClasses: fetching classes list'
    );

    try {
      const whereCondition: any = {
        client_id,
        is_deleted: false,
      };

      if (status) {
        whereCondition.status = status;
      }

      if (division) {
        whereCondition.division = division;
      }

      if (academic_year) {
        whereCondition.academic_year = academic_year;
      }

      if (class_teacher_id) {
        whereCondition.class_teacher_id = class_teacher_id;
      }

      if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        whereCondition[Op.or] = [
          { name: { [Op.iLike]: query } },
          { code: { [Op.iLike]: query } },
          { division: { [Op.iLike]: query } },
          { room_number: { [Op.iLike]: query } },
        ];
      }

      const { count, rows } = await classRepository.findAndCountAll({
        whereCondition,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      logger.info(
        { client_id, total: count, fetched: rows.length },
        'ClassService.getAllClasses: classes fetched successfully'
      );

      return {
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'ClassService.getAllClasses: error fetching classes');
      throw error;
    }
  }

  async getClassById(id: string, client_id?: string) {
    logger.info({ id, client_id }, 'ClassService.getClassById: fetching class details');

    try {
      const classItem = await classRepository.findById(id, client_id);
      if (!classItem) {
        logger.warn({ id, client_id }, 'ClassService.getClassById: class not found');
        return null;
      }

      logger.info({ id }, 'ClassService.getClassById: class details fetched successfully');
      return classItem;
    } catch (error) {
      logger.error({ err: error, id }, 'ClassService.getClassById: error fetching class');
      throw error;
    }
  }

  async createClass(client_id: string, classData: CreateClassRequest, created_by?: string) {
    logger.info(
      { client_id, name: classData.name, division: classData.division },
      'ClassService.createClass: initiating class creation'
    );
    const trx = await getSequelize().transaction();

    try {
      // 1. Verify Client exists
      const client = await Client.findOne({
        where: { id: client_id, is_deleted: false },
        transaction: trx,
      });

      if (!client) {
        await trx.rollback();
        logger.warn({ client_id }, 'ClassService.createClass: client does not exist');
        return { success: false, message: 'Client does not exist' };
      }

      // 2. If class_teacher_id is provided, verify teacher exists
      if (classData.class_teacher_id) {
        const teacher = await Teacher.findOne({
          where: { id: classData.class_teacher_id, client_id, is_deleted: false },
          transaction: trx,
        });

        if (!teacher) {
          await trx.rollback();
          logger.warn(
            { class_teacher_id: classData.class_teacher_id, client_id },
            'ClassService.createClass: designated class teacher not found'
          );
          return { success: false, message: 'Designated class teacher does not exist in this organization' };
        }
      }

      // 3. Create Class record
      const classItem = await classRepository.create(
        {
          client_id,
          name: classData.name,
          code: classData.code || null,
          division: classData.division || null,
          academic_year: classData.academic_year || null,
          room_number: classData.room_number || null,
          capacity: classData.capacity || null,
          class_teacher_id: classData.class_teacher_id || null,
          status: classData.status || 'active',
          description: classData.description || null,
          metadata: classData.metadata || null,
          created_by: created_by || null,
          updated_by: created_by || null,
        },
        trx
      );

      await trx.commit();
      logger.info(
        { class_id: classItem.id, client_id, name: classItem.name },
        'ClassService.createClass: class created successfully'
      );

      const fullClass = await this.getClassById(classItem.id, client_id);
      return {
        success: true,
        message: 'Class created successfully',
        class: fullClass,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'ClassService.createClass: error creating class');
      throw error;
    }
  }

  async updateClass(
    id: string,
    client_id: string,
    updateData: UpdateClassRequest,
    updated_by?: string
  ) {
    logger.info({ id, client_id, updateData }, 'ClassService.updateClass: updating class');
    const trx = await getSequelize().transaction();

    try {
      const classItem = await ClassModel.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!classItem) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'ClassService.updateClass: class not found');
        return { success: false, message: 'Class not found' };
      }

      if (updateData.class_teacher_id) {
        const teacher = await Teacher.findOne({
          where: { id: updateData.class_teacher_id, client_id, is_deleted: false },
          transaction: trx,
        });

        if (!teacher) {
          await trx.rollback();
          return { success: false, message: 'Designated class teacher does not exist in this organization' };
        }
      }

      const classUpdates: any = {
        updated_by: updated_by || null,
        updated_at: new Date(),
      };

      if (updateData.name) classUpdates.name = updateData.name;
      if (updateData.code !== undefined) classUpdates.code = updateData.code;
      if (updateData.division !== undefined) classUpdates.division = updateData.division;
      if (updateData.academic_year !== undefined) classUpdates.academic_year = updateData.academic_year;
      if (updateData.room_number !== undefined) classUpdates.room_number = updateData.room_number;
      if (updateData.capacity !== undefined) classUpdates.capacity = updateData.capacity;
      if (updateData.class_teacher_id !== undefined) classUpdates.class_teacher_id = updateData.class_teacher_id;
      if (updateData.status) classUpdates.status = updateData.status;
      if (updateData.description !== undefined) classUpdates.description = updateData.description;
      if (updateData.metadata !== undefined) classUpdates.metadata = updateData.metadata;

      await classItem.update(classUpdates, { transaction: trx });

      await trx.commit();
      logger.info({ id, client_id }, 'ClassService.updateClass: class updated successfully');

      const updatedClass = await this.getClassById(id, client_id);
      return {
        success: true,
        message: 'Class updated successfully',
        class: updatedClass,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'ClassService.updateClass: error updating class');
      throw error;
    }
  }

  async deleteClass(id: string, client_id: string, updated_by?: string) {
    logger.info({ id, client_id, updated_by }, 'ClassService.deleteClass: deleting class');
    const trx = await getSequelize().transaction();

    try {
      const classItem = await ClassModel.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!classItem) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'ClassService.deleteClass: class not found');
        return { success: false, message: 'Class not found' };
      }

      await classItem.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ id, client_id }, 'ClassService.deleteClass: class deleted successfully');

      return {
        success: true,
        message: 'Class deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'ClassService.deleteClass: error deleting class');
      throw error;
    }
  }
}

export default new ClassService();
