import User from '../models/user.model';
import UserMapping from '../models/user-mapping.model';
import Role from '../models/role.model';
import Client from '../models/client.model';
import { LoginRequest, RegisterRequest } from '../interfaces/auth.interface';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../plugins/logger-plugins';
import ROLES from '../constants/roles-constant';
import { Op } from 'sequelize';

export class AuthService {
  async login(loginData: LoginRequest) {
    const identifier = (loginData.username || loginData.email || loginData.phone || '').trim();
    logger.info({ identifier }, 'AuthService.login: login attempt initiated');

    if (!identifier) {
      return { success: false, message: 'Email or phone is required' };
    }
    if (!loginData.password) {
      return { success: false, message: 'Password is required' };
    }

    try {
      const user = await User.findOne({
        where: {
          is_deleted: false,
          [Op.or]: [{ email: identifier }, { phone: identifier }],
        },
        include: [
          {
            model: UserMapping,
            as: 'user_mappings',
            where: { is_deleted: false },
            required: false,
            include: [
              { model: Role, as: 'role' },
              { model: Client, as: 'client' },
            ],
          },
        ],
      });

      if (!user) {
        logger.warn({ identifier }, 'AuthService.login: user not found');
        return { success: false, message: 'Invalid credentials' };
      }

      if (user.status !== 'active') {
        logger.warn({ identifier, status: user.status }, 'AuthService.login: user account not active');
        return { success: false, message: `Account is ${user.status}. Please contact administrator.` };
      }

      if (!user.password) {
        logger.warn({ identifier }, 'AuthService.login: user has no password set');
        return { success: false, message: 'Password not set. Please reset your password.' };
      }

      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        logger.warn({ identifier }, 'AuthService.login: invalid password attempt');
        return { success: false, message: 'Invalid credentials' };
      }

      // Build clients map: { [client_id]: role_id }
      const mappings = (user as any).user_mappings || [];
      const clientsMap: Record<string, string> = {};
      let highestUserType = ROLES.STUDENT as string;

      for (const m of mappings) {
        if (m.client_id && m.role_id) {
          clientsMap[m.client_id] = m.role_id;
        }

        const roleName = m.role?.name;
        if (roleName === ROLES.SUPER_ADMIN) {
          highestUserType = ROLES.SUPER_ADMIN;
        } else if (roleName === ROLES.INCHARGE && highestUserType !== ROLES.SUPER_ADMIN) {
          highestUserType = ROLES.INCHARGE;
        } else if (roleName === ROLES.ADMIN && ![ROLES.SUPER_ADMIN, ROLES.INCHARGE].includes(highestUserType as any)) {
          highestUserType = ROLES.ADMIN;
        } else if (roleName === ROLES.TEACHER && ![ROLES.SUPER_ADMIN, ROLES.INCHARGE, ROLES.ADMIN].includes(highestUserType as any)) {
          highestUserType = ROLES.TEACHER;
        }
      }

      const secretKey = process.env.JWT_SECRET || 'NEMS_SECRET_KEY_SUPER_SECURE_12345';
      const tokenPayload = {
        user_id: user.id,
        user_type: highestUserType,
        clients: clientsMap,
        token_version: user.token_version || 0,
        email: user.email,
        phone: user.phone,
      };

      const token = jwt.sign(tokenPayload, secretKey, {
        expiresIn: (process.env.JWT_EXPIRES_IN as any) || '24h',
      });

      logger.info(
        { user_id: user.id, user_type: highestUserType, clientCount: Object.keys(clientsMap).length },
        'AuthService.login: user successfully authenticated'
      );

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          user_type: highestUserType,
          clients: clientsMap,
        },
      };
    } catch (error) {
      logger.error({ err: error, identifier }, 'AuthService.login: error during login');
      throw error;
    }
  }
}

export default new AuthService();
