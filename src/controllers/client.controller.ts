import { FastifyRequest, FastifyReply } from 'fastify';
import clientService from '../services/client.service';
import { CreateClientRequest, UpdateClientRequest } from '../interfaces/client.interface';
import { getPagination } from '../utility/pagination.util';
import logger from '../plugins/logger-plugins';

export class ClientController {
  async getAllClients(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as { k?: string; status?: string };
      const { page, limit, offset } = getPagination(request.query);

      logger.info({ page, limit, query }, 'ClientController.getAllClients: received request');

      const result = await clientService.getAllClients(page, limit, offset, query.k, query.status);
      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClientController.getAllClients: error retrieving clients');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async getClientById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      logger.info({ id }, 'ClientController.getClientById: received request');

      if (!id) {
        return reply.code(400).send({
          success: false,
          message: 'Client ID is required',
        });
      }

      const client = await clientService.getClientById(id);
      if (!client) {
        return reply.code(404).send({
          success: false,
          message: 'Client not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Client fetched successfully',
        client,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'ClientController.getClientById: error retrieving client');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async createClient(request: FastifyRequest, reply: FastifyReply) {
    try {
      const clientData = request.body as CreateClientRequest;
      const user_id = request.user?.user_id;

      logger.info({ clientData, user_id }, 'ClientController.createClient: received client creation request');

      if (!clientData || !clientData.orgn_name) {
        logger.warn('ClientController.createClient: missing organization name');
        return reply.code(400).send({
          success: false,
          message: 'Organization name (orgn_name) is required',
        });
      }

      const result = await clientService.createClient(clientData, user_id);
      return reply.code(201).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClientController.createClient: error creating client');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async updateClient(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const updateData = request.body as UpdateClientRequest;
      const user_id = request.user?.user_id;

      logger.info({ id, updateData, user_id }, 'ClientController.updateClient: received client update request');

      if (!id) {
        return reply.code(400).send({
          success: false,
          message: 'Client ID is required',
        });
      }

      const result = await clientService.updateClient(id, updateData, user_id);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClientController.updateClient: error updating client');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async deleteClient(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user_id = request.user?.user_id;

      logger.info({ id, user_id }, 'ClientController.deleteClient: received client deletion request');

      if (!id) {
        return reply.code(400).send({
          success: false,
          message: 'Client ID is required',
        });
      }

      const result = await clientService.deleteClient(id, user_id);
      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error({ err: error }, 'ClientController.deleteClient: error deleting client');
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new ClientController();
