import Subject from '../models/subject.model';
import Teacher from '../models/teacher.model';
import ClassModel from '../models/class.model';
import Client from '../models/client.model';
import { CreateSubjectRequest, UpdateSubjectRequest } from '../interfaces/subject.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import { Op } from 'sequelize';
import subjectRepository from '../repositories/subject.repository';

export class SubjectService {
  async getAllSubjects(
    client_id: string,
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    search?: string,
    class_id?: string,
    teacher_id?: string,
    status?: string,
    is_elective?: string | boolean
  ) {
    logger.info(
      { client_id, page, limit, search, class_id, teacher_id, status, is_elective },
      'SubjectService.getAllSubjects: fetching subjects list'
    );

    try {
      const whereCondition: any = {
        client_id,
        is_deleted: false,
      };

      if (status) {
        whereCondition.status = status;
      }

      if (class_id) {
        whereCondition.class_id = class_id;
      }

      if (teacher_id) {
        whereCondition.teacher_id = teacher_id;
      }

      if (is_elective !== undefined) {
        whereCondition.is_elective = String(is_elective) === 'true';
      }

      if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        whereCondition[Op.or] = [
          { name: { [Op.iLike]: query } },
          { code: { [Op.iLike]: query } },
          { description: { [Op.iLike]: query } },
        ];
      }

      const { count, rows } = await subjectRepository.findAndCountAll({
        whereCondition,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      logger.info(
        { client_id, total: count, fetched: rows.length },
        'SubjectService.getAllSubjects: subjects fetched successfully'
      );

      return {
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'SubjectService.getAllSubjects: error fetching subjects');
      throw error;
    }
  }

  async getSubjectById(id: string, client_id?: string) {
    logger.info({ id, client_id }, 'SubjectService.getSubjectById: fetching subject details');

    try {
      const subject = await subjectRepository.findById(id, client_id);
      if (!subject) {
        logger.warn({ id, client_id }, 'SubjectService.getSubjectById: subject not found');
        return null;
      }

      logger.info({ id }, 'SubjectService.getSubjectById: subject details fetched successfully');
      return subject;
    } catch (error) {
      logger.error({ err: error, id }, 'SubjectService.getSubjectById: error fetching subject');
      throw error;
    }
  }

  async createSubject(client_id: string, subjectData: CreateSubjectRequest, created_by?: string) {
    logger.info(
      { client_id, code: subjectData.code, name: subjectData.name, teacher_id: subjectData.teacher_id },
      'SubjectService.createSubject: initiating subject creation'
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
        logger.warn({ client_id }, 'SubjectService.createSubject: client does not exist');
        return { success: false, message: 'Client does not exist' };
      }

      // 2. Check code uniqueness within client
      const existingCode = await subjectRepository.findByCode(subjectData.code, client_id, trx);
      if (existingCode) {
        await trx.rollback();
        logger.warn({ code: subjectData.code, client_id }, 'SubjectService.createSubject: subject code already exists');
        return {
          success: false,
          message: `Subject with code '${subjectData.code}' already exists in this organization.`,
        };
      }

      // 3. Verify teacher exists if teacher_id is provided
      if (subjectData.teacher_id) {
        const teacher = await Teacher.findOne({
          where: { id: subjectData.teacher_id, client_id, is_deleted: false },
          transaction: trx,
        });

        if (!teacher) {
          await trx.rollback();
          logger.warn({ teacher_id: subjectData.teacher_id, client_id }, 'SubjectService.createSubject: teacher not found');
          return { success: false, message: 'Assigned teacher does not exist in this organization' };
        }
      }

      // 4. Verify class exists if class_id is provided
      if (subjectData.class_id) {
        const classItem = await ClassModel.findOne({
          where: { id: subjectData.class_id, client_id, is_deleted: false },
          transaction: trx,
        });

        if (!classItem) {
          await trx.rollback();
          logger.warn({ class_id: subjectData.class_id, client_id }, 'SubjectService.createSubject: class not found');
          return { success: false, message: 'Assigned class does not exist in this organization' };
        }
      }

      // 5. Create Subject record
      const subject = await subjectRepository.create(
        {
          client_id,
          name: subjectData.name,
          code: subjectData.code,
          description: subjectData.description || null,
          class_id: subjectData.class_id || null,
          teacher_id: subjectData.teacher_id || null, // Teacher foreign key
          credits: subjectData.credits ?? null,
          total_marks: subjectData.total_marks ?? 100,
          passing_marks: subjectData.passing_marks ?? 40,
          is_elective: subjectData.is_elective ?? false,
          status: subjectData.status || 'active',
          metadata: subjectData.metadata || null,
          created_by: created_by || null,
          updated_by: created_by || null,
        },
        trx
      );

      await trx.commit();
      logger.info(
        { subject_id: subject.id, client_id, code: subject.code, teacher_id: subject.teacher_id },
        'SubjectService.createSubject: subject created successfully'
      );

      const fullSubject = await this.getSubjectById(subject.id, client_id);
      return {
        success: true,
        message: 'Subject created successfully',
        subject: fullSubject,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'SubjectService.createSubject: error creating subject');
      throw error;
    }
  }

  async updateSubject(
    id: string,
    client_id: string,
    updateData: UpdateSubjectRequest,
    updated_by?: string
  ) {
    logger.info({ id, client_id, updateData }, 'SubjectService.updateSubject: updating subject');
    const trx = await getSequelize().transaction();

    try {
      const subject = await Subject.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!subject) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'SubjectService.updateSubject: subject not found');
        return { success: false, message: 'Subject not found' };
      }

      // Check code uniqueness if changing
      if (updateData.code && updateData.code !== subject.code) {
        const conflict = await Subject.findOne({
          where: {
            code: updateData.code,
            client_id,
            is_deleted: false,
            id: { [Op.ne]: id },
          },
          transaction: trx,
        });

        if (conflict) {
          await trx.rollback();
          return { success: false, message: `Subject code '${updateData.code}' is already taken.` };
        }
      }

      // Verify teacher if updating teacher_id
      if (updateData.teacher_id) {
        const teacher = await Teacher.findOne({
          where: { id: updateData.teacher_id, client_id, is_deleted: false },
          transaction: trx,
        });

        if (!teacher) {
          await trx.rollback();
          return { success: false, message: 'Assigned teacher does not exist in this organization' };
        }
      }

      // Verify class if updating class_id
      if (updateData.class_id) {
        const classItem = await ClassModel.findOne({
          where: { id: updateData.class_id, client_id, is_deleted: false },
          transaction: trx,
        });

        if (!classItem) {
          await trx.rollback();
          return { success: false, message: 'Assigned class does not exist in this organization' };
        }
      }

      const subjectUpdates: any = {
        updated_by: updated_by || null,
        updated_at: new Date(),
      };

      if (updateData.name) subjectUpdates.name = updateData.name;
      if (updateData.code) subjectUpdates.code = updateData.code;
      if (updateData.description !== undefined) subjectUpdates.description = updateData.description;
      if (updateData.class_id !== undefined) subjectUpdates.class_id = updateData.class_id;
      if (updateData.teacher_id !== undefined) subjectUpdates.teacher_id = updateData.teacher_id;
      if (updateData.credits !== undefined) subjectUpdates.credits = updateData.credits;
      if (updateData.total_marks !== undefined) subjectUpdates.total_marks = updateData.total_marks;
      if (updateData.passing_marks !== undefined) subjectUpdates.passing_marks = updateData.passing_marks;
      if (updateData.is_elective !== undefined) subjectUpdates.is_elective = updateData.is_elective;
      if (updateData.status) subjectUpdates.status = updateData.status;
      if (updateData.metadata !== undefined) subjectUpdates.metadata = updateData.metadata;

      await subject.update(subjectUpdates, { transaction: trx });

      await trx.commit();
      logger.info({ id, client_id }, 'SubjectService.updateSubject: subject updated successfully');

      const updatedSubject = await this.getSubjectById(id, client_id);
      return {
        success: true,
        message: 'Subject updated successfully',
        subject: updatedSubject,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'SubjectService.updateSubject: error updating subject');
      throw error;
    }
  }

  async deleteSubject(id: string, client_id: string, updated_by?: string) {
    logger.info({ id, client_id, updated_by }, 'SubjectService.deleteSubject: deleting subject');
    const trx = await getSequelize().transaction();

    try {
      const subject = await Subject.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!subject) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'SubjectService.deleteSubject: subject not found');
        return { success: false, message: 'Subject not found' };
      }

      await subject.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ id, client_id }, 'SubjectService.deleteSubject: subject deleted successfully');

      return {
        success: true,
        message: 'Subject deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'SubjectService.deleteSubject: error deleting subject');
      throw error;
    }
  }
}

export default new SubjectService();
