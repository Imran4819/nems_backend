import Client from '../models/client.model';
import Role from '../models/role.model';
import UserMapping from '../models/user-mapping.model';
import { CreateClientRequest, UpdateClientRequest } from '../interfaces/client.interface';
import { getSequelize } from '../plugins/sequelize-plugin';
import logger from '../plugins/logger-plugins';
import ROLES, { ROLES_SHORTCODE } from '../constants/roles-constant';
import { Op } from 'sequelize';

export class ClientService {
  async getAllClients(
    page: number = 1,
    limit: number = 10,
    offset: number = 0,
    search?: string,
    status?: string
  ) {
    logger.info({ page, limit, search, status }, 'ClientService.getAllClients: fetching clients list');

    try {
      const whereCondition: any = {
        is_deleted: false,
      };

      if (status) {
        whereCondition.status = status;
      }

      if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        whereCondition[Op.or] = [
          { 'orgn_details.orgn_name': { [Op.iLike]: query } },
          { 'primary_info.short_name': { [Op.iLike]: query } },
          { 'primary_info.orgn_email': { [Op.iLike]: query } },
        ];
      }

      const { count, rows } = await Client.findAndCountAll({
        where: whereCondition,
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      // Enhance clients with user and role count statistics
      const clientsWithStats = await Promise.all(
        rows.map(async (client) => {
          const clientJson = client.toJSON();
          const userCount = await UserMapping.count({
            where: { client_id: client.id, is_deleted: false },
          });
          const roleCount = await Role.count({
            where: { client_id: client.id, is_deleted: false },
          });

          return {
            ...clientJson,
            user_count: userCount,
            role_count: roleCount,
          };
        })
      );

      logger.info(
        { total: count, fetched: clientsWithStats.length, page },
        'ClientService.getAllClients: successfully retrieved clients'
      );

      return {
        success: true,
        clients: clientsWithStats,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error({ err: error }, 'ClientService.getAllClients: failed to retrieve clients');
      throw error;
    }
  }

  async getClientById(id: string) {
    logger.info({ id }, 'ClientService.getClientById: fetching client details');
    try {
      const client = await Client.findOne({
        where: { id, is_deleted: false },
        include: [
          {
            model: Role,
            as: 'roles',
            where: { is_deleted: false },
            required: false,
          },
        ],
      });

      if (!client) {
        logger.warn({ id }, 'ClientService.getClientById: client not found');
        return null;
      }

      const userCount = await UserMapping.count({
        where: { client_id: id, is_deleted: false },
      });

      logger.info({ id, userCount }, 'ClientService.getClientById: client retrieved successfully');

      return {
        ...client.toJSON(),
        user_count: userCount,
      };
    } catch (error) {
      logger.error({ err: error, id }, 'ClientService.getClientById: error fetching client');
      throw error;
    }
  }

  async createClient(clientData: CreateClientRequest, created_by?: string) {
    logger.info({ clientData, created_by }, 'ClientService.createClient: starting client creation');
    const trx = await getSequelize().transaction();

    try {
      const newClient = await Client.create(
        {
          orgn_details: {
            orgn_name: clientData.orgn_name,
            orgn_type: clientData.orgn_type || 'Institution',
            logo: clientData.logo || null,
            address: clientData.address || null,
            tagline: clientData.tagline || '',
          },
          primary_info: {
            orgn_email: clientData.orgn_email || '',
            orgn_phone: clientData.orgn_phone || null,
            orgn_website: clientData.orgn_website || null,
            short_name: clientData.short_name || clientData.orgn_name.substring(0, 10),
            domain: clientData.domain || '',
          },
          admin_details: {
            admin_name: clientData.admin_name || '',
            admin_phone: clientData.admin_phone || '',
            admin_email: clientData.admin_email || '',
          },
          status: clientData.status || 'active',
          country: clientData.country || 'India',
          timezone: clientData.timezone || 'Asia/Kolkata',
          language: clientData.language || 'English',
          parent_orgn_id: clientData.parent_orgn_id || null,
          custom_fields: clientData.custom_fields || {},
          created_by: created_by || null,
          updated_by: created_by || null,
        },
        { transaction: trx }
      );

      logger.info({ client_id: newClient.id }, 'Client created. Initializing default client roles...');

      // Automatically initialize default roles for this client
      // Required roles: Incharge, Admin, Teacher, Student
      const defaultRolesToCreate = [
        {
          name: ROLES.INCHARGE,
          short_code: ROLES_SHORTCODE.INCHARGE,
          description: 'Incharge with full administrative and supervisory authority (same features as Super Admin)',
          is_system: true,
        },
        {
          name: ROLES.ADMIN,
          short_code: ROLES_SHORTCODE.ADMIN,
          description: 'Organization Administrator',
          is_system: true,
        },
        {
          name: ROLES.TEACHER,
          short_code: ROLES_SHORTCODE.TEACHER,
          description: 'Faculty and Teacher role',
          is_system: true,
        },
        {
          name: ROLES.STUDENT,
          short_code: ROLES_SHORTCODE.STUDENT,
          description: 'Student role',
          is_system: true,
        },
      ];

      const createdRoles = await Promise.all(
        defaultRolesToCreate.map((role) =>
          Role.create(
            {
              ...role,
              client_id: newClient.id,
              created_by: created_by || null,
              updated_by: created_by || null,
            },
            { transaction: trx }
          )
        )
      );

      await trx.commit();
      logger.info({ client_id: newClient.id, rolesCount: createdRoles.length }, 'Client created successfully with roles');

      return {
        success: true,
        message: 'Client and default roles created successfully',
        client: newClient,
        roles: createdRoles,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error }, 'ClientService.createClient: transaction rolled back due to error');
      throw error;
    }
  }

  async updateClient(id: string, updateData: UpdateClientRequest, updated_by?: string) {
    logger.info({ id, updateData, updated_by }, 'ClientService.updateClient: updating client');
    const trx = await getSequelize().transaction();

    try {
      const client = await Client.findOne({
        where: { id, is_deleted: false },
        transaction: trx,
      });

      if (!client) {
        await trx.rollback();
        logger.warn({ id }, 'ClientService.updateClient: client not found');
        return { success: false, message: 'Client not found' };
      }

      const currentOrgn = client.orgn_details || {};
      const currentPrimary = client.primary_info || {};
      const currentAdmin = client.admin_details || {};

      await client.update(
        {
          orgn_details: {
            ...currentOrgn,
            ...(updateData.orgn_name !== undefined && { orgn_name: updateData.orgn_name }),
            ...(updateData.orgn_type !== undefined && { orgn_type: updateData.orgn_type }),
            ...(updateData.logo !== undefined && { logo: updateData.logo }),
            ...(updateData.address !== undefined && { address: updateData.address }),
            ...(updateData.tagline !== undefined && { tagline: updateData.tagline }),
          },
          primary_info: {
            ...currentPrimary,
            ...(updateData.orgn_email !== undefined && { orgn_email: updateData.orgn_email }),
            ...(updateData.orgn_phone !== undefined && { orgn_phone: updateData.orgn_phone }),
            ...(updateData.orgn_website !== undefined && { orgn_website: updateData.orgn_website }),
            ...(updateData.short_name !== undefined && { short_name: updateData.short_name }),
            ...(updateData.domain !== undefined && { domain: updateData.domain }),
          },
          admin_details: {
            ...currentAdmin,
            ...(updateData.admin_name !== undefined && { admin_name: updateData.admin_name }),
            ...(updateData.admin_phone !== undefined && { admin_phone: updateData.admin_phone }),
            ...(updateData.admin_email !== undefined && { admin_email: updateData.admin_email }),
          },
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.country && { country: updateData.country }),
          ...(updateData.timezone && { timezone: updateData.timezone }),
          ...(updateData.language && { language: updateData.language }),
          ...(updateData.custom_fields && { custom_fields: updateData.custom_fields }),
          updated_by: updated_by || null,
          updated_at: new Date(),
        },
        { transaction: trx }
      );

      await trx.commit();
      logger.info({ id }, 'ClientService.updateClient: client updated successfully');

      return {
        success: true,
        message: 'Client updated successfully',
        client,
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id }, 'ClientService.updateClient: error updating client');
      throw error;
    }
  }

  async deleteClient(id: string, updated_by?: string) {
    logger.info({ id, updated_by }, 'ClientService.deleteClient: deleting client');
    const trx = await getSequelize().transaction();

    try {
      const client = await Client.findOne({
        where: { id, is_deleted: false },
        transaction: trx,
      });

      if (!client) {
        await trx.rollback();
        logger.warn({ id }, 'ClientService.deleteClient: client not found');
        return { success: false, message: 'Client not found' };
      }

      // Check active users in client
      const activeUsersCount = await UserMapping.count({
        where: { client_id: id, is_deleted: false },
        transaction: trx,
      });

      if (activeUsersCount > 0) {
        logger.warn(
          { id, activeUsersCount },
          'ClientService.deleteClient: cannot delete client with active assigned users'
        );
        await trx.rollback();
        return {
          success: false,
          message: `Cannot delete client with ${activeUsersCount} active users assigned.`,
        };
      }

      await client.update(
        {
          is_deleted: true,
          updated_by: updated_by || null,
          updated_at: new Date(),
        },
        { transaction: trx }
      );

      // Soft delete associated roles
      await Role.update(
        { is_deleted: true, updated_by: updated_by || null, updated_at: new Date() },
        { where: { client_id: id }, transaction: trx }
      );

      await trx.commit();
      logger.info({ id }, 'ClientService.deleteClient: client and roles deleted successfully');

      return {
        success: true,
        message: 'Client deleted successfully',
      };
    } catch (error) {
      await trx.rollback();
      logger.error({ err: error, id }, 'ClientService.deleteClient: error deleting client');
      throw error;
    }
  }
}

export default new ClientService();
