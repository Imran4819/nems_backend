import UserMapping from '../models/user-mapping.model';
import Role from '../models/role.model';
import User from '../models/user.model';
import Client from '../models/client.model';
import { Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class UserMappingRepository {
  async findOne(userId: string, clientId: string, transaction?: Transaction) {
    logger.info({ userId, clientId }, 'UserMappingRepository: finding user mapping');
    return UserMapping.findOne({
      where: {
        user_id: userId,
        client_id: clientId,
        is_deleted: false,
      },
      include: [
        { model: Role, as: 'role' },
        { model: Client, as: 'client' },
        { model: User, as: 'user' },
      ],
      transaction,
    });
  }

  async create(mappingData: any, transaction?: Transaction) {
    logger.info({ userId: mappingData.user_id, clientId: mappingData.client_id }, 'UserMappingRepository: creating user mapping');
    return UserMapping.create(mappingData, { transaction });
  }

  async update(id: string, updateData: any, transaction?: Transaction) {
    logger.info({ id }, 'UserMappingRepository: updating user mapping');
    const [affectedCount] = await UserMapping.update(updateData, {
      where: { id, is_deleted: false },
      transaction,
    });
    return affectedCount;
  }

  async countByRoleId(roleId: string, clientId?: string, transaction?: Transaction) {
    logger.info({ roleId, clientId }, 'UserMappingRepository: counting users by role');
    const where: any = { role_id: roleId, is_deleted: false };
    if (clientId) {
      where.client_id = clientId;
    }
    return UserMapping.count({ where, transaction });
  }

  async softDeleteByUserIdAndClientId(userId: string, clientId: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ userId, clientId, updatedBy }, 'UserMappingRepository: soft deleting mapping');
    const [affectedCount] = await UserMapping.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where: { user_id: userId, client_id: clientId, is_deleted: false }, transaction }
    );
    return affectedCount;
  }
}

export default new UserMappingRepository();
