import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export const userContext: FastifyPluginAsync = fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Context attachment if needed
  });
});

export default userContext;
