import Client from '../models/client.model';
import { Op, Transaction } from 'sequelize';
import logger from '../plugins/logger-plugins';

export class ClientRepository {
  async findById(id: string, transaction?: Transaction) {
    logger.info({ id }, 'ClientRepository: finding client by ID');
    return Client.findOne({
      where: { id, is_deleted: false },
      transaction,
    });
  }

  async findAndCountAll(options: {
    whereCondition: any;
    limit: number;
    offset: number;
    order?: any[];
  }) {
    logger.info({ options }, 'ClientRepository: finding and counting clients');
    return Client.findAndCountAll({
      where: options.whereCondition,
      limit: options.limit,
      offset: options.offset,
      order: options.order || [['created_at', 'DESC']],
    });
  }

  async create(clientData: any, transaction?: Transaction) {
    logger.info({ orgn_name: clientData?.orgn_details?.orgn_name }, 'ClientRepository: creating new client');
    return Client.create(clientData, { transaction });
  }

  async update(id: string, updateData: any, transaction?: Transaction) {
    logger.info({ id }, 'ClientRepository: updating client');
    const [affectedCount] = await Client.update(updateData, {
      where: { id, is_deleted: false },
      transaction,
    });
    return affectedCount;
  }

  async softDelete(id: string, updatedBy?: string, transaction?: Transaction) {
    logger.info({ id, updatedBy }, 'ClientRepository: soft deleting client');
    const [affectedCount] = await Client.update(
      { is_deleted: true, updated_by: updatedBy, updated_at: new Date() },
      { where: { id, is_deleted: false }, transaction }
    );
    return affectedCount;
  }
}

export default new ClientRepository();
