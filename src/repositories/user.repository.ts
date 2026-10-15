import User from '../models/user.model';
import UserMapping from '../models/user-mapping.model';
import Role from '../models/role.model';
import Client from '../models/client.model';
import { Op, Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class UserRepository {
  async findById(id: string, transaction?: Transaction) {
    logger.info({ id }, 'UserRepository: finding user by ID');
    return User.findOne({
      where: { id, is_deleted: false },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: UserMapping,
          as: 'user_mappings',
          where: { is_deleted: false },
          required: false,
          include: [
            { model: Role, as: 'role', attributes: ['id', 'name', 'short_code'] },
            { model: Client, as: 'client', attributes: ['id', 'orgn_details', 'status'] },
          ],
        },
      ],
      transaction,
    });
  }

  async findByEmailOrPhone(email?: string, phone?: string, transaction?: Transaction) {
    logger.info({ email, phone }, 'UserRepository: finding user by email or phone');
    const orConditions: any[] = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    if (orConditions.length === 0) return null;

    return User.findOne({
      where: {
        is_deleted: false,
        [Op.or]: orConditions,
      },
      transaction,
    });
  }

  async findAndCountAll(options: {
    whereCondition: any;
    userMappingWhere: any;
    limit: number;
    offset: number;
    order?: any[];
  }) {
    logger.info({ options }, 'UserRepository: finding and counting users');
    return User.findAndCountAll({
      where: options.whereCondition,
      attributes: { exclude: ['password'] },
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['created_at', 'DESC']],
      include: [
        {
          model: UserMapping,
          as: 'user_mappings',
          where: options.userMappingWhere,
          required: true,
          include: [
            { model: Role, as: 'role', attributes: ['id', 'name', 'short_code'] },
            { model: Client, as: 'client', attributes: ['id', 'orgn_details', 'status'] },
          ],
        },
      ],
      distinct: true,
    });
  }

  async create(userData: any, transaction?: Transaction) {
    logger.info({ email: userData.email, phone: userData.phone }, 'UserRepository: creating user');
    return User.create(userData, { transaction });
  }

  async update(id: string, updateData: any, transaction?: Transaction) {
    logger.info({ id }, 'UserRepository: updating user');
    const [affectedCount] = await User.update(updateData, {
      where: { id, is_deleted: false },
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, updatedBy }, 'UserRepository: soft deleting user');
    const [affectedCount] = await User.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where: { id, is_deleted: false }, transaction }
    );
    return affectedCount;
  }
}

export default new UserRepository();
