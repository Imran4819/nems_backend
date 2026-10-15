import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { DecodedToken } from '../interfaces/decode_token.interface';
import User from '../models/user.model';
import logger from '../plugins/logger-plugins';

dotenv.config();

declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}

export const decodeToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ url: request.url, ip: request.ip }, 'Authorization token is missing or invalid format');
    return reply.status(401).send({
      success: false,
      message: 'Authorization token is missing or invalid format.',
    });
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.JWT_SECRET || 'NEMS_SECRET_KEY_SUPER_SECURE_12345';

  try {
    const decoded = jwt.verify(token, secretKey) as any;

    const user = await User.findOne({
      where: { id: decoded.user_id, is_deleted: false },
      attributes: ['id', 'token_version', 'status'],
      raw: true,
    });

    if (!user) {
      logger.warn({ user_id: decoded.user_id }, 'User not found during token verification');
      return reply.status(403).send({
        success: false,
        message: 'User not found or has been removed.',
      });
    }

    if (user.status !== 'active') {
      logger.warn({ user_id: decoded.user_id, status: user.status }, 'User account is not active');
      return reply.status(403).send({
        success: false,
        message: `Account is ${user.status}. Please contact administrator.`,
      });
    }

    if (user.token_version !== decoded.token_version) {
      logger.warn({ user_id: decoded.user_id }, 'Token version mismatch: session expired');
      return reply.status(401).send({
        success: false,
        message: 'Session expired. Please login again.',
        is_session_expired: true,
        reason: 'TOKEN_VERSION_MISMATCH',
      });
    }

    const tokenUser: DecodedToken = {
      user_id: decoded.user_id,
      user_type: decoded.user_type,
      clients: decoded.clients || [],
      token_version: decoded.token_version,
      impersonator_user_id: decoded.impersonator_user_id,
      email: decoded.email,
      phone: decoded.phone,
    };

    request.user = tokenUser;
    logger.debug({ user_id: tokenUser.user_id, user_type: tokenUser.user_type }, 'Token verified successfully');
    return tokenUser;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.warn({ error: error.message }, 'Token has expired');
      return reply.status(401).send({
        success: false,
        is_token_expired: true,
        message: 'Invalid or expired access token',
      });
    }

    logger.error({ error: error.message }, 'Unauthorized - Invalid token');
    return reply.status(401).send({
      success: false,
      message: 'Unauthorized - Invalid token',
    });
  }
};

export default decodeToken;
