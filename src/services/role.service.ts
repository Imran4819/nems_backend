import Role from '../models/role.model';
import Permission from '../models/permission.model';
import RolePermission from '../models/role-permission.model';
import UserMapping from '../models/user-mapping.model';
import { CreateRoleInput, UpdateRoleInput } from '../interfaces/role.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import ROLES, { ROLES_SHORTCODE } from '../constants/roles-constant';
import TokenService from '../middleware/token.service';
import { Op } from 'sequelize';

export class RoleService {
  async getRolesByClientId(
    client_id: string,
    user_id?: string,
    user_type?: string,
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    k?: string
  ) {
    logger.info({ client_id, user_id, user_type, page, limit, k }, 'RoleService.getRolesByClientId: fetching roles');

    try {
      const isElevated = TokenService.isSuperAdminOrIncharge(user_type);

      const whereCondition: any = {
        is_deleted: false,
        [Op.or]: [{ client_id }, { client_id: null, is_public: true }],
      };

      // Non-superadmin / non-incharge users cannot view global Super Admin roles
      if (!isElevated) {
        whereCondition.name = {
          [Op.notIn]: [ROLES.SUPER_ADMIN],
        };
      }

      if (k && k.trim()) {
        const query = `%${k.trim().toLowerCase()}%`;
        whereCondition[Op.and] = [
          {
            name: { [Op.iLike]: query },
          },
        ];
      }

      const { count, rows } = await Role.findAndCountAll({
        where: whereCondition,
        order: [['created_at', 'DESC']],
        offset,
        limit,
        distinct: true,
        include: [
          {
            model: RolePermission,
            as: 'role_permissions',
            required: false,
            include: [
              {
                model: Permission,
                as: 'permission',
                attributes: ['id', 'name', 'code', 'category'],
              },
            ],
          },
        ],
      });

      const rolesWithUserCount = await Promise.all(
        rows.map(async (role) => {
          const roleJson = role.toJSON();
          const userCount = await UserMapping.count({
            where: {
              role_id: role.id,
              client_id,
              is_deleted: false,
            },
          });

          return {
            ...roleJson,
            user_count: userCount,
          };
        })
      );

      logger.info(
        { client_id, total: count, fetched: rolesWithUserCount.length },
        'RoleService.getRolesByClientId: roles fetched successfully'
      );

      return {
        roles: rolesWithUserCount,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error, client_id }, 'RoleService.getRolesByClientId: error fetching roles');
      throw error;
    }
  }

  async getRoleById(role_id: string, client_id?: string) {
    logger.info({ role_id, client_id }, 'RoleService.getRoleById: fetching role');

    try {
      const where: any = { id: role_id, is_deleted: false };
      if (client_id) {
        where[Op.or] = [{ client_id }, { client_id: null }];
      }

      const role = await Role.findOne({
        where,
        include: [
          {
            model: RolePermission,
            as: 'role_permissions',
            include: [
              {
                model: Permission,
                as: 'permission',
                attributes: ['id', 'name', 'code', 'category'],
              },
            ],
          },
        ],
      });

      if (!role) {
        logger.warn({ role_id, client_id }, 'RoleService.getRoleById: role not found');
        return null;
      }

      const userCount = await UserMapping.count({
        where: { role_id: role.id, is_deleted: false },
      });

      return {
        ...role.toJSON(),
        user_count: userCount,
      };
    } catch (error) {
      logger.error({ err: error, role_id }, 'RoleService.getRoleById: error fetching role');
      throw error;
    }
  }

  async createRole(roleData: CreateRoleInput) {
    logger.info({ roleData }, 'RoleService.createRole: creating role');
    const trx = await getSequelize().transaction();

    try {
      const roleName = roleData.name.trim();
      const roleShortCode = roleData.short_code.trim();

      // Check if role name already exists for this client
      const existingRole = await Role.findOne({
        where: {
          client_id: roleData.client_id,
          name: { [Op.iLike]: roleName },
          is_deleted: false,
        },
        transaction: trx,
      });

      if (existingRole) {
        await trx.rollback();
        logger.warn(
          { roleName, client_id: roleData.client_id },
          'RoleService.createRole: duplicate role name in client'
        );
        return {
          success: false,
          message: `Role with name '${roleName}' already exists for this client.`,
        };
      }

      const newRole = await Role.create(
        {
          name: roleName,
          short_code: roleShortCode.toUpperCase(),
          description: roleData.description || null,
          client_id: roleData.client_id,
          is_system: roleData.is_system || false,
          is_public: roleData.is_public || false,
          created_by: roleData.created_by || null,
          updated_by: roleData.updated_by || null,
        },
        { transaction: trx }
      );

      // Assign permissions if provided
      if (roleData.permissions && roleData.permissions.length > 0) {
        const permissionRows = roleData.permissions.map((permId) => ({
          role_id: newRole.id,
          permission_id: permId,
          client_id: roleData.client_id,
        }));
        await RolePermission.bulkCreate(permissionRows, { transaction: trx });
        logger.info(
          { role_id: newRole.id, count: permissionRows.length },
          'RoleService.createRole: permissions assigned'
        );
      }

      await trx.commit();
      logger.info({ role_id: newRole.id }, 'RoleService.createRole: role committed successfully');

      const fullRole = await this.getRoleById(newRole.id, roleData.client_id);
      return {
        success: true,
        message: 'Role created successfully',
        role: fullRole,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, roleData }, 'RoleService.createRole: failed to create role');
      throw error;
    }
  }

  async updateRole(role_id: string, client_id: string, updateData: UpdateRoleInput) {
    logger.info({ role_id, client_id, updateData }, 'RoleService.updateRole: updating role');
    const trx = await getSequelize().transaction();

    try {
      const role = await Role.findOne({
        where: { id: role_id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!role) {
        await trx.rollback();
        logger.warn({ role_id, client_id }, 'RoleService.updateRole: role not found');
        return { success: false, message: 'Role not found' };
      }

      if (updateData.name && updateData.name.trim() !== role.name) {
        const duplicate = await Role.findOne({
          where: {
            client_id,
            name: { [Op.iLike]: updateData.name.trim() },
            id: { [Op.ne]: role_id },
            is_deleted: false,
          },
          transaction: trx,
        });

        if (duplicate) {
          await trx.rollback();
          logger.warn({ name: updateData.name }, 'RoleService.updateRole: duplicate role name');
          return {
            success: false,
            message: `Role with name '${updateData.name}' already exists for this client.`,
          };
        }
      }

      await role.update(
        {
          ...(updateData.name && { name: updateData.name.trim() }),
          ...(updateData.short_code && { short_code: updateData.short_code.trim().toUpperCase() }),
          ...(updateData.description !== undefined && { description: updateData.description }),
          updated_by: updateData.updated_by || null,
          updated_at: new Date(),
        },
        { transaction: trx }
      );

      // Update permissions if provided
      if (Array.isArray(updateData.permissions)) {
        await RolePermission.destroy({
          where: { role_id },
          transaction: trx,
        });

        if (updateData.permissions.length > 0) {
          const permRows = updateData.permissions.map((permId) => ({
            role_id,
            permission_id: permId,
            client_id,
          }));
          await RolePermission.bulkCreate(permRows, { transaction: trx });
        }
      }

      await trx.commit();
      logger.info({ role_id }, 'RoleService.updateRole: role updated successfully');

      const updated = await this.getRoleById(role_id, client_id);
      return {
        success: true,
        message: 'Role updated successfully',
        role: updated,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, role_id }, 'RoleService.updateRole: error updating role');
      throw error;
    }
  }

  async deleteRole(role_id: string, client_id: string, updated_by?: string) {
    logger.info({ role_id, client_id, updated_by }, 'RoleService.deleteRole: deleting role');
    const trx = await getSequelize().transaction();

    try {
      const role = await Role.findOne({
        where: { id: role_id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!role) {
        await trx.rollback();
        logger.warn({ role_id, client_id }, 'RoleService.deleteRole: role not found');
        return { success: false, message: 'Role not found' };
      }

      if (role.is_system) {
        await trx.rollback();
        logger.warn({ role_id }, 'RoleService.deleteRole: cannot delete system role');
        return { success: false, message: 'Cannot delete system-defined roles.' };
      }

      // Check if users are assigned to this role
      const userCount = await UserMapping.count({
        where: { role_id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (userCount > 0) {
        await trx.rollback();
        logger.warn(
          { role_id, userCount },
          'RoleService.deleteRole: cannot delete role with assigned users'
        );
        return {
          success: false,
          message: `Cannot delete role with ${userCount} assigned users. Please reassign them first.`,
        };
      }

      await role.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ role_id }, 'RoleService.deleteRole: role soft deleted successfully');

      return {
        success: true,
        message: 'Role deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, role_id }, 'RoleService.deleteRole: error deleting role');
      throw error;
    }
  }

  async setRolePermissions(role_id: string, client_id: string, permission_ids: string[]) {
    logger.info({ role_id, client_id, permission_ids }, 'RoleService.setRolePermissions: assigning permissions');
    const trx = await getSequelize().transaction();

    try {
      const role = await Role.findOne({
        where: { id: role_id, client_id, is_deleted: false },
        transaction: trx,
      });

      if (!role) {
        await trx.rollback();
        logger.warn({ role_id, client_id }, 'RoleService.setRolePermissions: role not found');
        return { success: false, message: 'Role not found' };
      }

      await RolePermission.destroy({
        where: { role_id },
        transaction: trx,
      });

      if (permission_ids.length > 0) {
        const rows = permission_ids.map((permId) => ({
          role_id,
          permission_id: permId,
          client_id,
        }));
        await RolePermission.bulkCreate(rows, { transaction: trx });
      }

      await trx.commit();
      logger.info({ role_id, count: permission_ids.length }, 'RoleService.setRolePermissions: permissions saved');

      const updated = await this.getRoleById(role_id, client_id);
      return {
        success: true,
        message: 'Role permissions updated successfully',
        role: updated,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, role_id }, 'RoleService.setRolePermissions: failed to set permissions');
      throw error;
    }
  }

  async getAllPermissions() {
    logger.info('RoleService.getAllPermissions: fetching all permissions');
    return Permission.findAll({
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
  }
}

export default new RoleService();
