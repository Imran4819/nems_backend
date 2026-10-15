import { FastifyReply, FastifyRequest } from 'fastify';
import Permission from '../models/permission.model';
import RolePermission from '../models/role-permission.model';
import RolePermissionAction from '../models/role-permission-action.model';
import Action from '../models/action.model';
import ROLES from '../constants/roles-constant';
import { Op } from 'sequelize';
import { TokenPermissionInterface } from '../interfaces/permission.interface';
import logger from '../plugins/logger-plugins';

declare module 'fastify' {
  interface FastifyRequest {
    permissions?: TokenPermissionInterface[];
  }
}

export class TokenService {
  /**
   * Check if user is Super Admin or Incharge
   * Incharge has the EXACT same features & privileges as Super Admin
   */
  static isSuperAdminOrIncharge(userType?: string): boolean {
    if (!userType) return false;
    const normalized = userType.toLowerCase().replace(/[\s_-]/g, '');
    return normalized === 'superadmin' || normalized === 'incharge';
  }

  static isTeacher(userType?: string): boolean {
    if (!userType) return false;
    const normalized = userType.toLowerCase().replace(/[\s_-]/g, '');
    return normalized === 'teacher';
  }

  static isStudent(userType?: string): boolean {
    if (!userType) return false;
    const normalized = userType.toLowerCase().replace(/[\s_-]/g, '');
    return normalized === 'student';
  }

  static hasAllowedPermissionAndAction(
    tokenPermissions: TokenPermissionInterface[],
    allowedPermission: string[],
    allowedAction: string[]
  ): boolean {
    return tokenPermissions.some((tp) => {
      const hasPermission = tp.permission_code.some((code) => allowedPermission.includes(code));
      const hasAction =
        !allowedAction || allowedAction.length === 0
          ? true
          : tp.actions.some((action) => allowedAction.includes(action));

      return hasPermission && hasAction;
    });
  }

  static checkPermission(allowedPermission: string[], allowedActions: string[]) {
    return async (req: FastifyRequest, res: FastifyReply) => {
      try {
        const params = req.params as { client_id?: string; user_id?: string; id?: string };
        const query = req.query as { client_id?: string };
        const body = (req.body as { client_id?: string }) || {};

        const client_id = params.client_id || query.client_id || body.client_id;
        const param_user_id = params.user_id || params.id;
        const token_user_id = req.user?.user_id;

        // User can access their own data via GET
        if (req.method === 'GET' && param_user_id && param_user_id === token_user_id) {
          logger.debug({ user_id: token_user_id }, 'Self-access granted for user');
          return;
        }

        const userType = req.user?.user_type;

        // Super Admin AND Incharge have full bypass / unlimited permissions
        if (this.isSuperAdminOrIncharge(userType)) {
          logger.info(
            { userType, user_id: token_user_id, url: req.url },
            'SuperAdmin / Incharge permission check bypass granted'
          );
          return;
        }

        // Teachers have explicit permission to add/view/update students and mark/view/update attendance
        if (this.isTeacher(userType)) {
          const isStudentAction =
            allowedPermission.some((p) => ['STU', 'STUDENTS', 'ACAD'].includes(p)) &&
            allowedActions.every((a) => ['C', 'R', 'U'].includes(a));
          const isAttendanceAction =
            allowedPermission.some((p) => ['ATTEND', 'ACAD'].includes(p)) &&
            allowedActions.every((a) => ['C', 'R', 'U'].includes(a));
          const isAcademicRead =
            allowedPermission.some((p) => ['CLASS', 'SUBJ', 'ACAD'].includes(p)) &&
            allowedActions.every((a) => ['R'].includes(a));

          if (isStudentAction || isAttendanceAction || isAcademicRead) {
            logger.info(
              { userType, user_id: token_user_id, url: req.url, allowedPermission, allowedActions },
              'Teacher permission granted for student and attendance operations'
            );
            return;
          }
        }

        // Students have explicit permission to read attendance, class, subject, and student records
        if (this.isStudent(userType)) {
          const isStudentReadAction =
            allowedPermission.some((p) => ['ATTEND', 'ACAD', 'STU', 'STUDENTS', 'CLASS', 'SUBJ'].includes(p)) &&
            allowedActions.every((a) => ['R'].includes(a));

          if (isStudentReadAction) {
            logger.info(
              { userType, user_id: token_user_id, url: req.url, allowedPermission, allowedActions },
              'Student read permission granted for attendance and academic queries'
            );
            return;
          }
        }

        if (!client_id) {
          logger.warn({ url: req.url }, 'client_id is required for permission check');
          return res.status(400).send({
            success: false,
            message: 'client_id is required.',
          });
        }

        const tokenActions = (await this.getAllowedUserPermissions(req, client_id, allowedPermission, allowedActions)) || [];
        req.permissions = tokenActions;

        const hasPermission = this.hasAllowedPermissionAndAction(tokenActions, allowedPermission, allowedActions);

        if (!hasPermission) {
          logger.warn(
            {
              user_id: token_user_id,
              userType,
              allowedPermission,
              allowedActions,
            },
            'Permission denied: user does not have required permissions'
          );
          return res.status(403).send({
            success: false,
            message: 'You do not have permission to perform this action.',
          });
        }

        return;
      } catch (error: any) {
        logger.error({ err: error }, 'Token permission verification error');
        return res.status(500).send({
          success: false,
          message: 'Token verification failed',
        });
      }
    };
  }

  static async getAllowedUserPermissions(
    req: FastifyRequest,
    client_id: string,
    allowedPermission: string[],
    allowedActions: string[]
  ) {
    const tokenPayload = req.user;
    const clientsMapping = tokenPayload?.clients as Record<string, string> | any[];

    let role_id: string | undefined;
    if (clientsMapping && typeof clientsMapping === 'object' && !Array.isArray(clientsMapping)) {
      role_id = clientsMapping[client_id];
    }

    if (!role_id) {
      logger.warn({ client_id, user_id: tokenPayload?.user_id }, 'No role mapping found for client');
      return [];
    }

    const permissionFilter =
      allowedPermission && allowedPermission.length > 0
        ? { code: { [Op.in]: allowedPermission } }
        : {};

    const actionFilter =
      allowedActions && allowedActions.length > 0
        ? { short_code: { [Op.in]: allowedActions } }
        : {};

    const rolePermissions = await RolePermission.findAll({
      where: { role_id, client_id },
      include: [
        {
          model: Permission,
          as: 'permission',
          where: permissionFilter,
          attributes: ['code'],
        },
        {
          model: RolePermissionAction,
          as: 'actions',
          attributes: ['action_id'],
          required: false,
          where: { client_id },
          include: [
            {
              model: Action,
              as: 'action_details',
              where: actionFilter,
              attributes: ['label', 'short_code'],
            },
          ],
        },
      ],
    });

    const formattedPermissions: TokenPermissionInterface[] = rolePermissions.map((rp: any) => ({
      permission_code: rp.permission?.code ? [rp.permission.code] : [],
      actions:
        rp.actions
          ?.map((a: any) => a.action_details?.short_code)
          ?.filter(Boolean) || [],
    }));

    return formattedPermissions;
  }
}

export default TokenService;
