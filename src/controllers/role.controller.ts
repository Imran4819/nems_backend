import { FastifyRequest, FastifyReply } from 'fastify';
import roleService from '../services/role.service';
import { CreateRoleRequest, UpdateRoleRequest, SetPermissionsRequest } from '../interfaces/role.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class RoleController {
  async getAllRoles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const { k } = request.query as { k?: string };
      const { page, limit, offset } = getPagination(request.query);
      const user_id = request.user?.user_id;
      const user_type = request.user?.user_type;

      logger.info({ client_id, user_id, user_type, page, limit, k }, 'RoleController.getAllRoles: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await roleService.getRolesByClientId(client_id, user_id, user_type, page, limit, offset, k);

      return reply.code(200).send({
        success: true,
        message: 'Roles retrieved successfully',
        roles: result.roles,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.getAllRoles: error fetching roles');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getRoleById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      logger.info({ client_id, id }, 'RoleController.getRoleById: received request');

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const role = await roleService.getRoleById(id, client_id);
      if (!role) {
        return reply.code(404).send({
          success: false,
          message: 'Role not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Role retrieved successfully',
        role,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.getRoleById: error fetching role');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createRole(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const roleData = request.body as CreateRoleRequest;
      const user_id = request.user?.user_id;

      logger.info({ client_id, roleData, user_id }, 'RoleController.createRole: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!roleData || !roleData.name || !roleData.short_code) {
        return reply.code(400).send({
          success: false,
          message: 'Role name and short_code are required',
        });
      }

      const result = await roleService.createRole({
        ...roleData,
        client_id,
        created_by: user_id,
        updated_by: user_id,
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.createRole: error creating role');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateRole(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const roleData = request.body as UpdateRoleRequest;
      const user_id = request.user?.user_id;

      logger.info({ client_id, id, roleData, user_id }, 'RoleController.updateRole: received request');

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await roleService.updateRole(id, client_id, {
        ...roleData,
        updated_by: user_id,
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.updateRole: error updating role');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteRole(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const user_id = request.user?.user_id;

      logger.info({ client_id, id, user_id }, 'RoleController.deleteRole: received request');

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await roleService.deleteRole(id, client_id, user_id);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.deleteRole: error deleting role');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async setRolePermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const { permissions } = request.body as SetPermissionsRequest;

      logger.info({ client_id, id, permissions }, 'RoleController.setRolePermissions: received request');

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      if (!permissions || !Array.isArray(permissions)) {
        return reply.code(400).send({
          success: false,
          message: 'permissions array is required',
        });
      }

      const result = await roleService.setRolePermissions(id, client_id, permissions);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.setRolePermissions: error assigning permissions');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getAllPermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const permissions = await roleService.getAllPermissions();
      return reply.code(200).send({
        success: true,
        permissions,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'RoleController.getAllPermissions: error fetching permissions');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new RoleController();
