import Role from '../models/role.model';
import RolePermission from '../models/role-permission.model';
import Permission from '../models/permission.model';
import { Op, Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class RoleRepository {
  async findById(id: string, clientId?: string, transaction?: Transaction) {
    logger.info({ id, clientId }, 'RoleRepository: finding role by ID');
    const where: any = { id, is_deleted: false };
    if (clientId) {
      where[Op.or] = [{ client_id: clientId }, { client_id: null }];
    }
    return Role.findOne({
      where,
      include: [
        {
          model: RolePermission,
          as: 'role_permissions',
          include: [
            {
              model: Permission,
              as: 'permission',
            },
          ],
        },
      ],
      transaction,
    });
  }

  async findByName(name: string, clientId?: string | null, excludeId?: string, transaction?: Transaction) {
    logger.info({ name, clientId, excludeId }, 'RoleRepository: finding role by name');
    const where: any = {
      name,
      is_deleted: false,
    };
    if (clientId) {
      where.client_id = clientId;
    }
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    return Role.findOne({ where, transaction });
  }

  async findAndCountAll(options: {
    whereCondition: any;
    limit: number;
    offset: number;
    order?: any[];
  }) {
    logger.info({ options }, 'RoleRepository: finding and counting roles');
    return Role.findAndCountAll({
      where: options.whereCondition,
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['created_at', 'DESC']],
      include: [
        {
          model: RolePermission,
          as: 'role_permissions',
          required: false,
          include: [
            {
              model: Permission,
              as: 'permission',
            },
          ],
        },
      ],
    });
  }

  async create(roleData: any, transaction?: Transaction) {
    logger.info({ name: roleData.name, client_id: roleData.client_id }, 'RoleRepository: creating role');
    return Role.create(roleData, { transaction });
  }

  async update(id: string, updateData: any, transaction?: Transaction) {
    logger.info({ id }, 'RoleRepository: updating role');
    const [affectedCount] = await Role.update(updateData, {
      where: { id, is_deleted: false },
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, updatedBy }, 'RoleRepository: soft deleting role');
    const [affectedCount] = await Role.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where: { id, is_deleted: false }, transaction }
    );
    return affectedCount;
  }
}

export default new RoleRepository();
