import Student from '../models/student.model';
import User from '../models/user.model';
import UserMapping from '../models/user-mapping.model';
import Role from '../models/role.model';
import Client from '../models/client.model';
import { CreateStudentRequest, UpdateStudentRequest } from '../interfaces/student.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import ROLES, { ROLES_SHORTCODE } from '../constants/roles-constant';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import studentRepository from '../repositories/student.repository';

export class StudentService {
  async getAllStudents(
    client_id: string,
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    search?: string,
    status?: string,
    class_name?: string,
    division?: string,
    academic_year?: string,
    teacher_id?: string
  ) {
    logger.info(
      { client_id, page, limit, search, status, class_name, division, academic_year, teacher_id },
      'StudentService.getAllStudents: fetching students list'
    );

    try {
      const whereCondition: any = {
        client_id,
        is_deleted: false,
      };

      if (status) {
        whereCondition.status = status;
      }

      if (class_name) {
        whereCondition.class_name = class_name;
      }

      if (division) {
        whereCondition.division = division;
      }

      if (academic_year) {
        whereCondition.academic_year = academic_year;
      }

      if (teacher_id) {
        whereCondition.teacher_id = teacher_id;
      }

      if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        whereCondition[Op.or] = [
          { first_name: { [Op.iLike]: query } },
          { last_name: { [Op.iLike]: query } },
          { email: { [Op.iLike]: query } },
          { phone: { [Op.iLike]: query } },
          { enrollment_number: { [Op.iLike]: query } },
          { roll_number: { [Op.iLike]: query } },
          { guardian_name: { [Op.iLike]: query } },
        ];
      }

      const { count, rows } = await studentRepository.findAndCountAll({
        whereCondition,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      logger.info(
        { client_id, total: count, fetched: rows.length },
        'StudentService.getAllStudents: students fetched successfully'
      );

      return {
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'StudentService.getAllStudents: error fetching students');
      throw error;
    }
  }

  async getStudentById(id: string, client_id?: string) {
    logger.info({ id, client_id }, 'StudentService.getStudentById: fetching student details');

    try {
      const student = await studentRepository.findById(id, client_id);
      if (!student) {
        logger.warn({ id, client_id }, 'StudentService.getStudentById: student not found');
        return null;
      }

      logger.info({ id }, 'StudentService.getStudentById: student details fetched successfully');
      return student;
    } catch (error) {
      logger.error({ err: error, id }, 'StudentService.getStudentById: error fetching student');
      throw error;
    }
  }

  async createStudent(client_id: string, studentData: CreateStudentRequest, created_by?: string) {
    logger.info(
      { client_id, enrollment_number: studentData.enrollment_number, email: studentData.email },
      'StudentService.createStudent: initiating student creation'
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
        logger.warn({ client_id }, 'StudentService.createStudent: client does not exist');
        return { success: false, message: 'Client does not exist' };
      }

      // 2. Check if student with same enrollment_number exists for this client
      const existingEnrollment = await studentRepository.findByEnrollmentNumber(
        studentData.enrollment_number,
        client_id,
        trx
      );

      if (existingEnrollment) {
        await trx.rollback();
        logger.warn(
          { enrollment_number: studentData.enrollment_number, client_id },
          'StudentService.createStudent: enrollment number already exists'
        );
        return {
          success: false,
          message: `Student with enrollment number '${studentData.enrollment_number}' already exists in this organization.`,
        };
      }

      // 3. Handle optional User account creation
      let userId: string | null = studentData.user_id || null;

      if (!userId && (studentData.create_user_account ?? true)) {
        logger.info(
          { email: studentData.email, phone: studentData.phone },
          'StudentService.createStudent: checking or creating user account for student'
        );

        let userInstance = await User.findOne({
          where: {
            [Op.or]: [{ email: studentData.email }, { phone: studentData.phone }],
            is_deleted: false,
          },
          transaction: trx,
        });

        if (!userInstance) {
          const rawPassword = studentData.password || '12345678';
          const hashedPassword = await bcrypt.hash(rawPassword, 10);

          userInstance = await User.create(
            {
              first_name: studentData.first_name,
              middle_name: studentData.middle_name || null,
              last_name: studentData.last_name,
              email: studentData.email,
              phone: studentData.phone,
              password: hashedPassword,
              status: 'active',
              gender: studentData.gender || null,
              date_of_birth: studentData.date_of_birth ? new Date(studentData.date_of_birth) : null,
              profile_image: studentData.profile_image || null,
              created_by: created_by || null,
              updated_by: created_by || null,
            },
            { transaction: trx }
          );
          logger.info({ user_id: userInstance.id }, 'Created user record for student');
        }

        userId = userInstance.id;

        // Resolve Student Role
        const studentRole = await Role.findOne({
          where: {
            [Op.or]: [
              { client_id, name: { [Op.iLike]: '%student%' } },
              { client_id, short_code: ROLES_SHORTCODE.STUDENT },
              { client_id: null, name: { [Op.iLike]: '%student%' } },
              { client_id: null, short_code: ROLES_SHORTCODE.STUDENT },
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
              role_id: studentRole ? studentRole.id : null,
              status: 'active',
              official_email: studentData.email,
              designation: 'Student',
              joining_date: studentData.admission_date ? new Date(studentData.admission_date) : new Date(),
              created_by: created_by || null,
              updated_by: created_by || null,
            },
            { transaction: trx }
          );
          logger.info(
            { user_id: userInstance.id, client_id, role_id: studentRole?.id },
            'Created student user mapping'
          );
        } else if (!existingMapping.role_id && studentRole) {
          await existingMapping.update({ role_id: studentRole.id }, { transaction: trx });
        }
      }

      // 4. Create Student record
      const student = await studentRepository.create(
        {
          client_id,
          user_id: userId,
          teacher_id: studentData.teacher_id || null,
          enrollment_number: studentData.enrollment_number,
          first_name: studentData.first_name,
          middle_name: studentData.middle_name || null,
          last_name: studentData.last_name,
          email: studentData.email,
          phone: studentData.phone,
          gender: studentData.gender || null,
          date_of_birth: studentData.date_of_birth ? new Date(studentData.date_of_birth) : null,
          blood_group: studentData.blood_group || null,
          address: studentData.address || null,
          guardian_name: studentData.guardian_name || null,
          guardian_phone: studentData.guardian_phone || null,
          guardian_email: studentData.guardian_email || null,
          guardian_relation: studentData.guardian_relation || null,
          academic_year: studentData.academic_year || null,
          class_name: studentData.class_name || null,
          division: studentData.division || null,
          roll_number: studentData.roll_number || null,
          admission_date: studentData.admission_date ? new Date(studentData.admission_date) : new Date(),
          status: studentData.status || 'active',
          profile_image: studentData.profile_image || null,
          metadata: studentData.metadata || null,
          created_by: created_by || null,
          updated_by: created_by || null,
        },
        trx
      );

      await trx.commit();
      logger.info(
        { student_id: student.id, client_id, enrollment_number: student.enrollment_number },
        'StudentService.createStudent: student created successfully'
      );

      const fullStudent = await this.getStudentById(student.id, client_id);
      return {
        success: true,
        message: 'Student created successfully',
        student: fullStudent,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'StudentService.createStudent: error creating student');
      throw error;
    }
  }

  async updateStudent(
    id: string,
    client_id: string,
    updateData: UpdateStudentRequest,
    updated_by?: string
  ) {
    logger.info({ id, client_id, updateData }, 'StudentService.updateStudent: updating student');
    const trx = await getSequelize().transaction();

    try {
      const student = await Student.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!student) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'StudentService.updateStudent: student not found');
        return { success: false, message: 'Student not found' };
      }

      // Check enrollment number conflict if changing
      if (
        updateData.enrollment_number &&
        updateData.enrollment_number !== student.enrollment_number
      ) {
        const conflict = await Student.findOne({
          where: {
            enrollment_number: updateData.enrollment_number,
            client_id,
            is_deleted: false,
            id: { [Op.ne]: id },
          },
          transaction: trx,
        });

        if (conflict) {
          await trx.rollback();
          logger.warn(
            { enrollment_number: updateData.enrollment_number, client_id },
            'StudentService.updateStudent: enrollment number conflict'
          );
          return {
            success: false,
            message: `Enrollment number '${updateData.enrollment_number}' is already taken.`,
          };
        }
      }

      const studentUpdates: any = {
        updated_by: updated_by || null,
        updated_at: new Date(),
      };

      if (updateData.enrollment_number) studentUpdates.enrollment_number = updateData.enrollment_number;
      if (updateData.first_name) studentUpdates.first_name = updateData.first_name;
      if (updateData.middle_name !== undefined) studentUpdates.middle_name = updateData.middle_name;
      if (updateData.last_name) studentUpdates.last_name = updateData.last_name;
      if (updateData.email) studentUpdates.email = updateData.email;
      if (updateData.phone) studentUpdates.phone = updateData.phone;
      if (updateData.gender !== undefined) studentUpdates.gender = updateData.gender;
      if (updateData.date_of_birth) studentUpdates.date_of_birth = new Date(updateData.date_of_birth);
      if (updateData.blood_group !== undefined) studentUpdates.blood_group = updateData.blood_group;
      if (updateData.address !== undefined) studentUpdates.address = updateData.address;
      if (updateData.guardian_name !== undefined) studentUpdates.guardian_name = updateData.guardian_name;
      if (updateData.guardian_phone !== undefined) studentUpdates.guardian_phone = updateData.guardian_phone;
      if (updateData.guardian_email !== undefined) studentUpdates.guardian_email = updateData.guardian_email;
      if (updateData.guardian_relation !== undefined) studentUpdates.guardian_relation = updateData.guardian_relation;
      if (updateData.academic_year !== undefined) studentUpdates.academic_year = updateData.academic_year;
      if (updateData.class_name !== undefined) studentUpdates.class_name = updateData.class_name;
      if (updateData.division !== undefined) studentUpdates.division = updateData.division;
      if (updateData.roll_number !== undefined) studentUpdates.roll_number = updateData.roll_number;
      if (updateData.admission_date) studentUpdates.admission_date = new Date(updateData.admission_date);
      if (updateData.status) studentUpdates.status = updateData.status;
      if (updateData.teacher_id !== undefined) studentUpdates.teacher_id = updateData.teacher_id;
      if (updateData.profile_image !== undefined) studentUpdates.profile_image = updateData.profile_image;
      if (updateData.metadata !== undefined) studentUpdates.metadata = updateData.metadata;

      await student.update(studentUpdates, { transaction: trx });

      // If user account is linked, update User profile fields as well
      if (student.user_id) {
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
          where: { id: student.user_id },
          transaction: trx,
        });
      }

      await trx.commit();
      logger.info({ id, client_id }, 'StudentService.updateStudent: student updated successfully');

      const updatedStudent = await this.getStudentById(id, client_id);
      return {
        success: true,
        message: 'Student updated successfully',
        student: updatedStudent,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'StudentService.updateStudent: error updating student');
      throw error;
    }
  }

  async deleteStudent(id: string, client_id: string, updated_by?: string) {
    logger.info({ id, client_id, updated_by }, 'StudentService.deleteStudent: deleting student');
    const trx = await getSequelize().transaction();

    try {
      const student = await Student.findOne({
        where: { id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!student) {
        await trx.rollback();
        logger.warn({ id, client_id }, 'StudentService.deleteStudent: student not found');
        return { success: false, message: 'Student not found' };
      }

      await student.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ id, client_id }, 'StudentService.deleteStudent: student deleted successfully');

      return {
        success: true,
        message: 'Student deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id, client_id }, 'StudentService.deleteStudent: error deleting student');
      throw error;
    }
  }
}

export default new StudentService();
