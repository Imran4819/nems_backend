import User from '../models/user.model';
import UserMapping from '../models/user-mapping.model';
import Role from '../models/role.model';
import Client from '../models/client.model';
import Student from '../models/student.model';
import Teacher from '../models/teacher.model';
import { CreateUserRequest, UpdateUserRequest } from '../interfaces/user.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import UserUtility from '../utility/user.utility';
import ROLES, { ROLES_SHORTCODE } from '../constants/roles-constant';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

export class UserService {
  async getAllUsers(
    client_id: string,
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    search?: string,
    role_id?: string,
    role_name?: string,
    status?: string
  ) {
    logger.info(
      { client_id, page, limit, search, role_id, role_name, status },
      'UserService.getAllUsers: fetching users'
    );

    try {
      const userMappingWhere: any = {
        client_id,
        is_deleted: false,
      };

      if (status) {
        userMappingWhere.status = status;
      }

      if (role_id) {
        userMappingWhere.role_id = role_id;
      }

      const userWhere: any = {
        is_deleted: false,
      };

      if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        userWhere[Op.or] = [
          { first_name: { [Op.iLike]: query } },
          { last_name: { [Op.iLike]: query } },
          { email: { [Op.iLike]: query } },
          { phone: { [Op.iLike]: query } },
        ];
      }

      const roleWhere: any = {
        is_deleted: false,
      };

      if (role_name) {
        const normalized = UserUtility.normalizeRole(role_name);
        roleWhere.name = { [Op.iLike]: `%${normalized}%` };
      }

      const { count, rows: mappings } = await UserMapping.findAndCountAll({
        where: userMappingWhere,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            where: userWhere,
            required: true,
            attributes: { exclude: ['password'] },
          },
          {
            model: Role,
            as: 'role',
            where: Object.keys(roleWhere).length > 1 ? roleWhere : undefined,
            required: false,
            attributes: ['id', 'name', 'short_code', 'description'],
          },
        ],
        distinct: true,
      });

      const users = mappings.map((m) => {
        const mappingJson = m.toJSON();
        const { user, ...mappingWithoutUser } = mappingJson;
        return {
          ...user,
          mapping: mappingWithoutUser,
          role: mappingJson.role,
        };
      });

      logger.info(
        { client_id, total: count, fetched: users.length },
        'UserService.getAllUsers: users fetched successfully'
      );

      return {
        success: true,
        data: users,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'UserService.getAllUsers: error fetching users');
      throw error;
    }
  }

  async getUserById(user_id: string, client_id?: string) {
    logger.info({ user_id, client_id }, 'UserService.getUserById: fetching user details');

    try {
      const mappingWhere: any = {
        user_id,
        is_deleted: false,
      };
      if (client_id) {
        mappingWhere.client_id = client_id;
      }

      const user = await User.findOne({
        where: { id: user_id, is_deleted: false },
        attributes: { exclude: ['password'] },
        include: [
          {
            model: UserMapping,
            as: 'user_mappings',
            where: mappingWhere,
            required: false,
            include: [
              { model: Role, as: 'role' },
              { model: Client, as: 'client' },
            ],
          },
        ],
      });

      if (!user) {
        logger.warn({ user_id, client_id }, 'UserService.getUserById: user not found');
        return null;
      }

      logger.info({ user_id }, 'UserService.getUserById: user details fetched successfully');
      return user;
    } catch (error) {
      logger.error({ err: error, user_id }, 'UserService.getUserById: error fetching user');
      throw error;
    }
  }

  async createUser(client_id: string, userData: CreateUserRequest) {
    logger.info(
      { client_id, email: userData.email, phone: userData.phone },
      'UserService.createUser: initiating user creation'
    );
    const trx = await getSequelize().transaction();

    try {
      // Validate client exists
      const client = await Client.findOne({
        where: { id: client_id, is_deleted: false },
        transaction: trx,
      });

      if (!client) {
        await trx.rollback();
        logger.warn({ client_id }, 'UserService.createUser: client does not exist');
        return { success: false, message: 'Client does not exist' };
      }

      // Resolve role for user
      let targetRoleId: string | null = userData.role_id || null;
      let matchedRole: Role | null = null;

      if (!targetRoleId && userData.role_name) {
        const normalizedRoleName = UserUtility.normalizeRole(userData.role_name);
        matchedRole = await Role.findOne({
          where: {
            [Op.or]: [
              { client_id, name: { [Op.iLike]: normalizedRoleName } },
              { client_id, short_code: userData.role_name.toUpperCase() },
              { client_id: null, name: { [Op.iLike]: normalizedRoleName } },
              { client_id: null, short_code: userData.role_name.toUpperCase() },
            ],
            is_deleted: false,
          },
          transaction: trx,
        });

        if (matchedRole) {
          targetRoleId = matchedRole.id;
          logger.info({ roleName: normalizedRoleName, role_id: targetRoleId }, 'Matched role for user');
        } else {
          logger.warn({ roleName: normalizedRoleName }, 'Specified role name could not be found');
        }
      } else if (targetRoleId) {
        matchedRole = await Role.findOne({
          where: { id: targetRoleId, is_deleted: false },
          transaction: trx,
        });
      }

      // Check if user with email or phone already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email: userData.email }, { phone: userData.phone }],
          is_deleted: false,
        },
        transaction: trx,
      });

      let userInstance: User;
      let isExisting = false;

      if (existingUser) {
        isExisting = true;
        userInstance = existingUser;
        logger.info(
          { user_id: userInstance.id, email: userData.email },
          'User already exists. Checking mapping for this client...'
        );

        // Check if user is already mapped to this client
        const existingMapping = await UserMapping.findOne({
          where: {
            user_id: userInstance.id,
            client_id,
            is_deleted: false,
          },
          transaction: trx,
        });

        if (existingMapping) {
          await trx.rollback();
          logger.warn(
            { user_id: userInstance.id, client_id },
            'User is already active under this client'
          );
          return {
            success: false,
            message: 'User is already associated with this client.',
            user: userInstance,
          };
        }
      } else {
        // Create new user
        const hashedPassword = userData.password
          ? await bcrypt.hash(userData.password, 10)
          : await bcrypt.hash('ChangeMe@123', 10);

        userInstance = await User.create(
          {
            first_name: userData.first_name,
            middle_name: userData.middle_name || null,
            last_name: userData.last_name,
            email: userData.email,
            phone: userData.phone,
            password: hashedPassword,
            status: userData.status || 'active',
            gender: userData.gender || null,
            date_of_birth: userData.date_of_birth ? new Date(userData.date_of_birth) : null,
            profile_image: userData.profile_image || null,
            country_code: UserUtility.validateCountryCode(userData.country_code),
            created_by: userData.created_by || null,
            updated_by: userData.updated_by || null,
          },
          { transaction: trx }
        );

        logger.info({ user_id: userInstance.id }, 'New user profile created');
      }

      // Create UserMapping
      const mapping = await UserMapping.create(
        {
          user_id: userInstance.id,
          client_id,
          role_id: targetRoleId,
          status: userData.status || 'active',
          employee_id: userData.employee_id || null,
          joining_date: userData.joining_date ? new Date(userData.joining_date) : new Date(),
          official_email: userData.official_email || userData.email,
          designation: userData.designation || null,
          manager_id: userData.manager_id || null,
          created_by: userData.created_by || null,
          updated_by: userData.updated_by || null,
        },
        { transaction: trx }
      );

      // Auto-create Teacher or Student record if assigned role matches
      if (matchedRole) {
        const isTeacherRole = matchedRole.name === ROLES.TEACHER || matchedRole.short_code === ROLES_SHORTCODE.TEACHER || UserUtility.normalizeRole(userData.role_name) === 'Teacher';
        const isStudentRole = matchedRole.name === ROLES.STUDENT || matchedRole.short_code === ROLES_SHORTCODE.STUDENT || UserUtility.normalizeRole(userData.role_name) === 'Student';

        if (isTeacherRole) {
          const existingTeacher = await Teacher.findOne({
            where: { user_id: userInstance.id, client_id, is_deleted: false },
            transaction: trx,
          });
          if (!existingTeacher) {
            await Teacher.create({
              client_id,
              user_id: userInstance.id,
              employee_id: userData.employee_id || `TCH-${Date.now().toString().slice(-6)}`,
              first_name: userInstance.first_name,
              middle_name: userInstance.middle_name,
              last_name: userInstance.last_name,
              email: userInstance.email,
              phone: userInstance.phone,
              gender: userInstance.gender || null,
              designation: userData.designation || 'Teacher',
              status: 'active',
              created_by: userData.created_by || null,
              updated_by: userData.updated_by || null,
            }, { transaction: trx });
            logger.info({ user_id: userInstance.id, client_id }, 'Auto-created teacher profile record');
          }
        } else if (isStudentRole) {
          const existingStudent = await Student.findOne({
            where: { user_id: userInstance.id, client_id, is_deleted: false },
            transaction: trx,
          });
          if (!existingStudent) {
            await Student.create({
              client_id,
              user_id: userInstance.id,
              enrollment_number: userData.employee_id || `STD-${Date.now().toString().slice(-6)}`,
              first_name: userInstance.first_name,
              middle_name: userInstance.middle_name,
              last_name: userInstance.last_name,
              email: userInstance.email,
              phone: userInstance.phone,
              gender: userInstance.gender || null,
              status: 'active',
              created_by: userData.created_by || null,
              updated_by: userData.updated_by || null,
            }, { transaction: trx });
            logger.info({ user_id: userInstance.id, client_id }, 'Auto-created student profile record');
          }
        }
      }

      await trx.commit();
      logger.info(
        { user_id: userInstance.id, mapping_id: mapping.id, client_id },
        'UserService.createUser: user and client mapping created successfully'
      );

      const createdUser = await this.getUserById(userInstance.id, client_id);
      return {
        success: true,
        message: isExisting
          ? 'Existing user mapped to client successfully'
          : 'User created successfully',
        user: createdUser,
        isExistingUser: isExisting,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, client_id }, 'UserService.createUser: error during user creation');
      throw error;
    }
  }

  async updateUser(user_id: string, client_id: string, updateData: UpdateUserRequest, updated_by?: string) {
    logger.info({ user_id, client_id, updateData }, 'UserService.updateUser: updating user');
    const trx = await getSequelize().transaction();

    try {
      const user = await User.findOne({
        where: { id: user_id, is_deleted: false },
        transaction: trx,
      });

      if (!user) {
        await trx.rollback();
        logger.warn({ user_id }, 'UserService.updateUser: user not found');
        return { success: false, message: 'User not found' };
      }

      // Update User table fields
      const userUpdates: any = {
        updated_by: updated_by || null,
        updated_at: new Date(),
      };

      if (updateData.first_name) userUpdates.first_name = updateData.first_name;
      if (updateData.middle_name !== undefined) userUpdates.middle_name = updateData.middle_name;
      if (updateData.last_name) userUpdates.last_name = updateData.last_name;
      if (updateData.email) userUpdates.email = updateData.email;
      if (updateData.phone) userUpdates.phone = updateData.phone;
      if (updateData.gender !== undefined) userUpdates.gender = updateData.gender;
      if (updateData.date_of_birth) userUpdates.date_of_birth = new Date(updateData.date_of_birth);
      if (updateData.profile_image !== undefined) userUpdates.profile_image = updateData.profile_image;
      if (updateData.country_code) userUpdates.country_code = UserUtility.validateCountryCode(updateData.country_code);

      if (updateData.password) {
        userUpdates.password = await bcrypt.hash(updateData.password, 10);
        userUpdates.token_version = (user.token_version || 0) + 1; // invalidate previous sessions
      }

      await user.update(userUpdates, { transaction: trx });

      // Update UserMapping table fields
      const mapping = await UserMapping.findOne({
        where: { user_id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (mapping) {
        const mappingUpdates: any = {
          updated_by: updated_by || null,
          updated_at: new Date(),
        };

        if (updateData.role_id !== undefined) mappingUpdates.role_id = updateData.role_id;
        if (updateData.status !== undefined) mappingUpdates.status = updateData.status;
        if (updateData.employee_id !== undefined) mappingUpdates.employee_id = updateData.employee_id;
        if (updateData.joining_date) mappingUpdates.joining_date = new Date(updateData.joining_date);
        if (updateData.official_email !== undefined) mappingUpdates.official_email = updateData.official_email;
        if (updateData.designation !== undefined) mappingUpdates.designation = updateData.designation;
        if (updateData.manager_id !== undefined) mappingUpdates.manager_id = updateData.manager_id;

        await mapping.update(mappingUpdates, { transaction: trx });
      }

      await trx.commit();
      logger.info({ user_id, client_id }, 'UserService.updateUser: user updated successfully');

      const fullUser = await this.getUserById(user_id, client_id);
      return {
        success: true,
        message: 'User updated successfully',
        user: fullUser,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, user_id, client_id }, 'UserService.updateUser: error updating user');
      throw error;
    }
  }

  async deleteUser(user_id: string, client_id: string, updated_by?: string) {
    logger.info({ user_id, client_id, updated_by }, 'UserService.deleteUser: deleting user mapping');
    const trx = await getSequelize().transaction();

    try {
      const mapping = await UserMapping.findOne({
        where: { user_id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!mapping) {
        await trx.rollback();
        logger.warn({ user_id, client_id }, 'UserService.deleteUser: user mapping not found');
        return { success: false, message: 'User mapping not found for this client' };
      }

      await mapping.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      // Check if user has any other active mappings
      const remainingMappings = await UserMapping.count({
        where: { user_id, is_deleted: false },
        transaction: trx,
      });

      if (remainingMappings === 0) {
        logger.info({ user_id }, 'User has no more client mappings, soft deleting root user record');
        await User.update(
          { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
          { where: { id: user_id }, transaction: trx }
        );
      }

      await trx.commit();
      logger.info({ user_id, client_id }, 'UserService.deleteUser: user deleted successfully');

      return {
        success: true,
        message: 'User removed from client successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, user_id, client_id }, 'UserService.deleteUser: error deleting user');
      throw error;
    }
  }
}

export default new UserService();
