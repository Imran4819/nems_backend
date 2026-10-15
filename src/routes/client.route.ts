import { FastifyInstance } from 'fastify';
import clientController from '../controllers/client.controller';
import { decodeToken } from '../middleware/verify_token';
import TokenService from '../middleware/token.service';

export default async function clientRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', decodeToken);

  // Client Management CRUD
  fastify.get('/', clientController.getAllClients);
  fastify.get('/:id', clientController.getClientById);
  fastify.post('/', clientController.createClient);
  fastify.put('/:id', clientController.updateClient);
  fastify.delete('/:id', clientController.deleteClient);
}
