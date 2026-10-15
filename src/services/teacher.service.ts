import Teacher from '../models/teacher.model';
import User from '../models/user.model';
import UserMapping from '../models/user-mapping.model';
import Role from '../models/role.model';
import Client from '../models/client.model';
import { CreateTeacherRequest, UpdateTeacherRequest } from '../interfaces/teacher.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import ROLES, { ROLES_SHORTCODE } from '../constants/roles-constant';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import teacherRepository from '../repositories/teacher.repository';

export class TeacherService {
  async getAllTeachers(
    client_id: string,
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    search?: string,
    status?: string,
    specialization?: string,
    qualification?: string
  ) {
    logger.info(
      { client_id, page, limit, search, status, specialization, qualification },
      'TeacherService.getAllTeachers: fetching teachers list'
    );

    try {
      const whereCondition: any = {
        client_id,
        is_deleted: false,
      };

      if (status) {
        whereCondition.status = status;
      }

      if (specialization) {
        whereCondition.specialization = specialization;
      }

      if (qualification) {
        whereCondition.qualification = qualification;
      }

      if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        whereCondition[Op.or] = [
          { first_name: { [Op.iLike]: query } },
          { last_name: { [Op.iLike]: query } },
          { email: { [Op.iLike]: query } },
          { phone: { [Op.iLike]: query } },
          { employee_id: { [Op.iLike]: query } },
          { specialization: { [Op.iLike]: query } },
        ];
      }

      const { count, rows } = await teacherRepository.findAndCountAll({
        whereCondition,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      logger.info(
        { client_id, total: count, fetched: rows.length },
        'TeacherService.getAllTeachers: teachers fetched successfully'
      );

      return {
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'TeacherService.getAllTeachers: error fetching teachers');
      throw error;
    }
  }

  async getTeacherById(id: string, client_id?: string) {
    logger.info({ id, client_id }, 'TeacherService.getTeacherById: fetching teacher details');

    try {
      const teacher = await teacherRepository.findById(id, client_id);
      if (!teacher) {
        logger.warn({ id, client_id }, 'TeacherService.getTeacherById: teacher not found');
        return null;
      }

      logger.info({ id }, 'TeacherService.getTeacherById: teacher details fetched successfully');
      return teacher;
    } catch (error) {
      logger.error({ err: error, id }, 'TeacherService.getTeacherById: error fetching teacher');
      throw error;
    }
  }

  async createTeacher(client_id: string, teacherData: CreateTeacherRequest, created_by?: string) {
    logger.info(
      { client_id, employee_id: teacherData.employee_id, email: teacherData.email },
      'TeacherService.createTeacher: initiating teacher creation'
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
        logger.warn({ client_id }, 'TeacherService.createTeacher: client does not exist');
        return { success: false, message: 'Client does not exist' };
      }

      // 2. Check if teacher with same employee_id exists for this client
      const existingEmp = await teacherRepository.findByEmployeeId(
        teacherData.employee_id,
        client_id,
        trx
      );

      if (existingEmp) {
        await trx.rollback();
        logger.warn(
          { employee_id: teacherData.employee_id, client_id },
          'TeacherService.createTeacher: employee ID already exists'
        );
        return {
          success: false,
          message: `Teacher with employee ID '${teacherData.employee_id}' already exists in this organization.`,
        };
      }

      // 3. Handle optional User account creation
      let userId: string | null = teacherData.user_id || null;

      if (!userId && (teacherData.create_user_account ?? true)) {
        logger.info(
          { email: teacherData.email, phone: teacherData.phone },
          'TeacherService.createTeacher: checking or creating user account for teacher'
        );

        let userInstance = await User.findOne({
          where: {
            [Op.or]: [{ email: teacherData.email }, { phone: teacherData.phone }],
            is_deleted: false,
          },
          transaction: trx,
        });

        if (!userInstance) {
          const rawPassword = teacherData.password || '12345678';
          const hashedPassword = await bcrypt.hash(rawPassword, 10);

          userInstance = await User.create(
            {
              first_name: teacherData.first_name,
              middle_name: teacherData.middle_name || null,
              last_name: teacherData.last_name,
              email: teacherData.email,
              phone: teacherData.phone,
              password: hashedPassword,
              status: 'active',
              gender: teacherData.gender || null,
              date_of_birth: teacherData.date_of_birth ? new Date(teacherData.date_of_birth) : null,
              profile_image: teacherData.profile_image || null,
              created_by: created_by || null,
              updated_by: created_by || null,
            },
            { transaction: trx }
          );
          logger.info({ user_id: userInstance.id }, 'Created user record for teacher');
        }

        userId = userInstance.id;

        // Resolve Teacher Role
        const teacherRole = await Role.findOne({
          where: {
            [Op.or]: [
              { client_id, name: { [Op.iLike]: '%teacher%' } },
              { client_id, short_code: ROLES_SHORTCODE.TEACHER },
              { client_id: null, name: { [Op.iLike]: '%teacher%' } },
              { client_id: null, short_code: ROLES_SHORTCODE.TEACHER },
            ],
            is_deleted: false,
          },
          transaction: trx,
        });

        // Ensure UserMapping exists
        const existingMapping = await UserMapping.findOne({
          where: {
            user_id: userInstance.id,
            client_id,
            is_deleted: false,
          },
          transaction: trx,
        });

        if (!existingMapping) {
          await UserMapping.create(
            {
              user_id: userInstance.id,
              client_id,
              role_id: teacherRole ? teacherRole.id : null,
              status: 'active',
              employee_id: teacherData.employee_id,
              official_email: teacherData.email,
              designation: teacherData.specialization || 'Teacher',
              joining_date: teacherData.joining_date ? new Date(teacherData.joining_date) : new Date(),
              created_by: created_by || null,
              updated_by: created_by || null,
            },
            { transaction: trx }
          );
          logger.info(
            { user_id: userInstance.id, client_id, role_id: teacherRole?.id },
            'Created teacher user mapping'
          );
        } else if (!existingMapping.role_id && teacherRole) {
          await existingMapping.update({ role_id: teacherRole.id }, { transaction: trx });
        }
      }

      // 4. Create Teacher record
      const teacher = await teacherRepository.create(
        {
          client_id,
          user_id: userId,
          employee_id: teacherData.employee_id,
          first_name: teacherData.first_name,
          middle_name: teacherData.middle_name || null,
          last_name: teacherData.last_name,
          email: teacherData.email,
          phone: teacherData.phone,
          gender: teacherData.gender || null,
          date_of_birth: teacherData.date_of_birth ? new Date(teacherData.date_of_birth) : null,
          blood_group: teacherData.blood_group || null,
          qualification: teacherData.qualification || null,
          specialization: teacherData.specialization || null,
          experience_years: teacherData.experience_years ?? null,
          joining_date: teacherData.joining_date ? new Date(teacherData.joining_date) : new Date(),
          status: teacherData.status || 'active',
          address: teacherData.address || null,
          profile_image: teacherData.profile_image || null,
          metadata: teacherData.metadata || null,
          created_by: created_by || null,
          updated_by: created_by || null,
        },
        trx
      );

      await trx.commit();
      logger.info(
        { teacher_id: teacher.id, client_id, employee_id: teacher.employee_id },
        'TeacherService.createTeacher: teacher created successfully'
      );

      const fullTeacher = await this.getTeacherById(teacher.id, client_id);
      return {
        success: true,
        message: 'Teacher created successfully',
        teacher: fullTeacher,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'TeacherService.createTeacher: error creating teacher');
      throw error;
    }
  }

  async updateTeacher(
    id: string,
    client_id: string,
    updateData: UpdateTeacherRequest,
    updated_by?: string
  ) {
    logger.info({ id, client_id, updateData }, 'TeacherService.updateTeacher: updating teacher');
    const trx = await getSequelize().transaction();

    try {
      const teacher = await Teacher.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!teacher) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'TeacherService.updateTeacher: teacher not found');
        return { success: false, message: 'Teacher not found' };
      }

      // Check employee_id conflict if updating
      if (
        updateData.employee_id &&
        updateData.employee_id !== teacher.employee_id
      ) {
        const conflict = await Teacher.findOne({
          where: {
            employee_id: updateData.employee_id,
            client_id,
            is_deleted: false,
            id: { [Op.ne]: id },
          },
          transaction: trx,
        });

        if (conflict) {
          await trx.rollback();
          logger.warn(
            { employee_id: updateData.employee_id, client_id },
            'TeacherService.updateTeacher: employee ID conflict'
          );
          return {
            success: false,
            message: `Employee ID '${updateData.employee_id}' is already taken.`,
          };
        }
      }

      const teacherUpdates: any = {
        updated_by: updated_by || null,
        updated_at: new Date(),
      };

      if (updateData.employee_id) teacherUpdates.employee_id = updateData.employee_id;
      if (updateData.first_name) teacherUpdates.first_name = updateData.first_name;
      if (updateData.middle_name !== undefined) teacherUpdates.middle_name = updateData.middle_name;
      if (updateData.last_name) teacherUpdates.last_name = updateData.last_name;
      if (updateData.email) teacherUpdates.email = updateData.email;
      if (updateData.phone) teacherUpdates.phone = updateData.phone;
      if (updateData.gender !== undefined) teacherUpdates.gender = updateData.gender;
      if (updateData.date_of_birth) teacherUpdates.date_of_birth = new Date(updateData.date_of_birth);
      if (updateData.blood_group !== undefined) teacherUpdates.blood_group = updateData.blood_group;
      if (updateData.qualification !== undefined) teacherUpdates.qualification = updateData.qualification;
      if (updateData.specialization !== undefined) teacherUpdates.specialization = updateData.specialization;
      if (updateData.experience_years !== undefined) teacherUpdates.experience_years = updateData.experience_years;
      if (updateData.joining_date) teacherUpdates.joining_date = new Date(updateData.joining_date);
      if (updateData.status) teacherUpdates.status = updateData.status;
      if (updateData.address !== undefined) teacherUpdates.address = updateData.address;
      if (updateData.profile_image !== undefined) teacherUpdates.profile_image = updateData.profile_image;
      if (updateData.metadata !== undefined) teacherUpdates.metadata = updateData.metadata;

      await teacher.update(teacherUpdates, { transaction: trx });

      // If user account is linked, update User profile fields
      if (teacher.user_id) {
        const userUpdates: any = {
          updated_by: updated_by || null,
          updated_at: new Date(),
        };
        if (updateData.first_name) userUpdates.first_name = updateData.first_name;
        if (updateData.middle_name !== undefined) userUpdates.middle_name = updateData.middle_name;
        if (updateData.last_name) userUpdates.last_name = updateData.last_name;
        if (updateData.email) userUpdates.email = updateData.email;
        if (updateData.phone) userUpdates.phone = updateData.phone;
        if (updateData.profile_image !== undefined) userUpdates.profile_image = updateData.profile_image;
        if (updateData.password) {
          userUpdates.password = await bcrypt.hash(updateData.password, 10);
        }

        await User.update(userUpdates, {
          where: { id: teacher.user_id },
          transaction: trx,
        });
      }

      await trx.commit();
      logger.info({ id, client_id }, 'TeacherService.updateTeacher: teacher updated successfully');

      const updatedTeacher = await this.getTeacherById(id, client_id);
      return {
        success: true,
        message: 'Teacher updated successfully',
        teacher: updatedTeacher,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'TeacherService.updateTeacher: error updating teacher');
      throw error;
    }
  }

  async deleteTeacher(id: string, client_id: string, updated_by?: string) {
    logger.info({ id, client_id, updated_by }, 'TeacherService.deleteTeacher: deleting teacher');
    const trx = await getSequelize().transaction();

    try {
      const teacher = await Teacher.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!teacher) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'TeacherService.deleteTeacher: teacher not found');
        return { success: false, message: 'Teacher not found' };
      }

      await teacher.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ id, client_id }, 'TeacherService.deleteTeacher: teacher deleted successfully');

      return {
        success: true,
        message: 'Teacher deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'TeacherService.deleteTeacher: error deleting teacher');
      throw error;
    }
  }
}

export default new TeacherService();
