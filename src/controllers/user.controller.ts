import { FastifyRequest, FastifyReply } from 'fastify';
import userService from '../services/user.service';
import { CreateUserRequest, UpdateUserRequest, GetUsersQuery } from '../interfaces/user.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class UserController {
  async getAllUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const query = request.query as GetUsersQuery;
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ client_id, page, limit, query }, 'UserController.getAllUsers: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      const result = await userService.getAllUsers(
        client_id,
        page,
        limit,
        offset,
        query.k,
        query.role_id,
        query.role_name,
        query.status
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'UserController.getAllUsers: error fetching users');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id?: string; id?: string };
      const user_id = id || (request.params as any).user_id;

      logger.info({ client_id, user_id }, 'UserController.getUserById: received request');

      if (!user_id) {
        return reply.code(400).send({
          success: false,
          message: 'User ID is required',
        });
      }

      const user = await userService.getUserById(user_id, client_id);
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'User fetched successfully',
        user,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'UserController.getUserById: error fetching user');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id } = request.params as { client_id: string };
      const userData = request.body as CreateUserRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, userData, loggedInUserId }, 'UserController.createUser: received request');

      if (!client_id) {
        return reply.code(400).send({
          success: false,
          message: 'client_id is required',
        });
      }

      if (!userData || !userData.email || !userData.phone || !userData.first_name || !userData.last_name) {
        return reply.code(400).send({
          success: false,
          message: 'first_name, last_name, email, and phone are required',
        });
      }

      const result = await userService.createUser(client_id, {
        ...userData,
        created_by: loggedInUserId,
        updated_by: loggedInUserId,
      });

      if (!result.success) {
        return reply.code(400).send(result);
      }

      const statusCode = result.isExistingUser ? 200 : 201;
      return reply.code(statusCode).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'UserController.createUser: error creating user');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const userData = request.body as UpdateUserRequest;
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, id, userData, loggedInUserId }, 'UserController.updateUser: received request');

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await userService.updateUser(id, client_id, userData, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'UserController.updateUser: error updating user');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { client_id, id } = request.params as { client_id: string; id: string };
      const loggedInUserId = request.user?.user_id;

      logger.info({ client_id, id, loggedInUserId }, 'UserController.deleteUser: received request');

      if (!client_id || !id) {
        return reply.code(400).send({
          success: false,
          message: !client_id ? 'client_id is required' : 'id is required',
        });
      }

      const result = await userService.deleteUser(id, client_id, loggedInUserId);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'UserController.deleteUser: error deleting user');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new UserController();
