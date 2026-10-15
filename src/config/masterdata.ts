import Role from '../models/role.model';
import Permission from '../models/permission.model';
import Action from '../models/action.model';
import RolePermission from '../models/role-permission.model';
import RolePermissionAction from '../models/role-permission-action.model';
import User from '../models/user.model';
import Client from '../models/client.model';
import UserMapping from '../models/user-mapping.model';
import ClassModel from '../models/class.model';
import Subject from '../models/subject.model';
import Student from '../models/student.model';
import Teacher from '../models/teacher.model';
import ROLES, { ROLES_SHORTCODE } from '../constants/roles-constant';
import bcrypt from 'bcrypt';
import logger from '../plugins/logger-plugins';

export async function createMasterData() {
  logger.info('MasterData: Starting master data seeding...');

  try {
    // 1. Seed Permissions
    const permissionsData = [
      { name: 'User Management', code: 'U', category: 'User Management', description: 'Manage users across system' },
      { name: 'Role Management', code: 'UR', category: 'Role Management', description: 'Manage roles and permissions' },
      { name: 'Client Management', code: 'C', category: 'Client Management', description: 'Manage client organizations' },
      { name: 'Academics Management', code: 'ACAD', category: 'Academics', description: 'Manage academic entities' },
      { name: 'Student Management', code: 'STU', category: 'Academics', description: 'Manage student records and admissions' },
      { name: 'Teacher Management', code: 'TEACH', category: 'Academics', description: 'Manage faculty and teachers' },
      { name: 'Class Management', code: 'CLASS', category: 'Academics', description: 'Manage classrooms and divisions' },
      { name: 'Subject Management', code: 'SUBJ', category: 'Academics', description: 'Manage subjects and curriculum' },
      { name: 'Attendance Management', code: 'ATTEND', category: 'Academics', description: 'Manage student and teacher attendance records' },
    ];

    logger.info('MasterData: Seeding permissions...');
    const seededPermissions: Record<string, Permission> = {};
    for (const perm of permissionsData) {
      let record = await Permission.findOne({ where: { code: perm.code } });
      if (!record) {
        record = await Permission.create(perm);
      }
      seededPermissions[perm.code] = record;
    }
    logger.info('MasterData: Permissions completed. Seeding actions...');
    const actionsData = [
      { label: 'Create', short_code: 'C' },
      { label: 'Read', short_code: 'R' },
      { label: 'Update', short_code: 'U' },
      { label: 'Delete', short_code: 'D' },
    ];

    const seededActions: Record<string, Action> = {};
    for (const act of actionsData) {
      let record = await Action.findOne({ where: { short_code: act.short_code } });
      if (!record) {
        record = await Action.create(act);
      }
      seededActions[act.short_code] = record;
    }

    logger.info('MasterData: Actions completed. Seeding roles...');
    // 3. Seed System Roles: Super Admin, Incharge, Admin, Teacher, Student
    const rolesData = [
      {
        name: ROLES.SUPER_ADMIN,
        short_code: ROLES_SHORTCODE.SUPER_ADMIN,
        description: 'System-wide Super Administrator with complete unrestricted authority',
        is_system: true,
        is_public: true,
        client_id: null,
      },
      {
        name: ROLES.INCHARGE,
        short_code: ROLES_SHORTCODE.INCHARGE,
        description: 'Platform Incharge with identical features, bypasses, and authority as Super Admin',
        is_system: true,
        is_public: true,
        client_id: null,
      },
      {
        name: ROLES.ADMIN,
        short_code: ROLES_SHORTCODE.ADMIN,
        description: 'Organization Administrator with management capabilities within their client',
        is_system: true,
        is_public: true,
        client_id: null,
      },
      {
        name: ROLES.TEACHER,
        short_code: ROLES_SHORTCODE.TEACHER,
        description: 'Faculty / Teacher with academic management permissions',
        is_system: true,
        is_public: true,
        client_id: null,
      },
      {
        name: ROLES.STUDENT,
        short_code: ROLES_SHORTCODE.STUDENT,
        description: 'Student with access to courses and student features',
        is_system: true,
        is_public: true,
        client_id: null,
      },
    ];

    const seededRoles: Record<string, Role> = {};
    for (const roleDef of rolesData) {
      let role = await Role.findOne({
        where: { name: roleDef.name, client_id: null },
      });
      if (!role) {
        role = await Role.create(roleDef);
      }
      seededRoles[roleDef.name] = role;

      // Assign all permissions to Super Admin and Incharge
      if (roleDef.name === ROLES.SUPER_ADMIN || roleDef.name === ROLES.INCHARGE) {
        for (const permCode of Object.keys(seededPermissions)) {
          const perm = seededPermissions[permCode];
          let rp = await RolePermission.findOne({
            where: { role_id: role.id, permission_id: perm.id },
          });

          if (!rp) {
            rp = await RolePermission.create({
              role_id: role.id,
              permission_id: perm.id,
              client_id: null,
              name: perm.name,
            });
          }

          for (const actCode of Object.keys(seededActions)) {
            const act = seededActions[actCode];
            const existingRpa = await RolePermissionAction.findOne({
              where: { role_permission_id: rp.id, action_id: act.id },
            });

            if (!existingRpa) {
              await RolePermissionAction.create({
                role_permission_id: rp.id,
                action_id: act.id,
                client_id: null,
              });
            }
          }
        }
      } else if (roleDef.name === ROLES.TEACHER) {
        // Teacher has permission to add/view students and mark attendance
        const teacherPerms: Record<string, string[]> = {
          STU: ['C', 'R', 'U'],
          ATTEND: ['C', 'R', 'U'],
          ACAD: ['C', 'R', 'U'],
          CLASS: ['R'],
          SUBJ: ['R'],
          U: ['C', 'R', 'U'],
        };

        for (const permCode of Object.keys(teacherPerms)) {
          const perm = seededPermissions[permCode];
          if (!perm) continue;

          let rp = await RolePermission.findOne({
            where: { role_id: role.id, permission_id: perm.id },
          });

          if (!rp) {
            rp = await RolePermission.create({
              role_id: role.id,
              permission_id: perm.id,
              client_id: null,
              name: perm.name,
            });
          }

          const actionCodes = teacherPerms[permCode];
          for (const actCode of actionCodes) {
            const act = seededActions[actCode];
            if (!act) continue;

            const existingRpa = await RolePermissionAction.findOne({
              where: { role_permission_id: rp.id, action_id: act.id },
            });

            if (!existingRpa) {
              await RolePermissionAction.create({
                role_permission_id: rp.id,
                action_id: act.id,
                client_id: null,
              });
            }
          }
        }
      } else if (roleDef.name === ROLES.STUDENT) {
        // Student has read permission for attendance, classes, subjects, and academic info
        const studentPerms: Record<string, string[]> = {
          ATTEND: ['R'],
          ACAD: ['R'],
          CLASS: ['R'],
          SUBJ: ['R'],
          STU: ['R'],
        };

        for (const permCode of Object.keys(studentPerms)) {
          const perm = seededPermissions[permCode];
          if (!perm) continue;

          let rp = await RolePermission.findOne({
            where: { role_id: role.id, permission_id: perm.id },
          });

          if (!rp) {
            rp = await RolePermission.create({
              role_id: role.id,
              permission_id: perm.id,
              client_id: null,
              name: perm.name,
            });
          }

          const actionCodes = studentPerms[permCode];
          for (const actCode of actionCodes) {
            const act = seededActions[actCode];
            if (!act) continue;

            const existingRpa = await RolePermissionAction.findOne({
              where: { role_permission_id: rp.id, action_id: act.id },
            });

            if (!existingRpa) {
              await RolePermissionAction.create({
                role_permission_id: rp.id,
                action_id: act.id,
                client_id: null,
              });
            }
          }
        }
      }
    }
    logger.info('MasterData: Roles completed. Seeding default client...');

    // 4. Seed Default Client if none exists
    let defaultClient = await Client.findOne({ where: { is_deleted: false } });
    if (!defaultClient) {
      defaultClient = await Client.create({
        orgn_details: {
          orgn_name: 'Nems Platform Headquarters',
          orgn_type: 'Central Admin',
          address: 'Headquarters Campus',
          tagline: 'Leading Educational & Enterprise Platform',
        },
        primary_info: {
          orgn_email: 'hq@nems.platform',
          orgn_phone: '+919999999999',
          short_name: 'NEMS_HQ',
          domain: 'nems.platform',
        },
        admin_details: {
          admin_name: 'Platform Incharge',
          admin_email: 'incharge@nems.platform',
          admin_phone: '+919888888888',
        },
        status: 'active',
        country: 'India',
        timezone: 'Asia/Kolkata',
        language: 'English',
      });
    }

    // 5. Seed Incharge, Teacher, and Student Users
    const defaultUsers = [
      {
        email: 'incharge@nems.platform',
        phone: '+919888888888',
        first_name: 'Platform',
        last_name: 'Incharge',
        role_name: ROLES.INCHARGE,
      },
      {
        email: 'teacher@nems.platform',
        phone: '+919777777777',
        first_name: 'Riya',
        last_name: 'Sharma',
        role_name: ROLES.TEACHER,
      },
      {
        email: 'student@nems.platform',
        phone: '+919666666666',
        first_name: 'Aarav',
        last_name: 'Sharma',
        role_name: ROLES.STUDENT,
      },
    ];

    const seededUserMap: Record<string, User> = {};
    const defaultPasswordHash = await bcrypt.hash('12345678', 10);

    for (const u of defaultUsers) {
      let existingUser = await User.findOne({
        where: { email: u.email, is_deleted: false },
      });

      if (!existingUser) {
        existingUser = await User.create({
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          phone: u.phone,
          password: defaultPasswordHash,
          status: 'active',
          country_code: '+91',
        });
        logger.info({ email: u.email }, `MasterData: Seeded user ${u.role_name}`);
      } else {
        await existingUser.update({ password: defaultPasswordHash, status: 'active' });
      }

      seededUserMap[u.role_name] = existingUser;

      const role = seededRoles[u.role_name];
      if (role && defaultClient) {
        const existingMapping = await UserMapping.findOne({
          where: {
            user_id: existingUser.id,
            client_id: defaultClient.id,
          },
        });

        if (!existingMapping) {
          await UserMapping.create({
            user_id: existingUser.id,
            client_id: defaultClient.id,
            role_id: role.id,
            status: 'active',
            official_email: u.email,
            designation: u.role_name,
            joining_date: new Date(),
          });
        } else if (!existingMapping.role_id) {
          await existingMapping.update({ role_id: role.id, status: 'active' });
        }
      }
    }

    // 6. Seed Sample Classes, Teachers, Students, and Subjects for defaultClient
    if (defaultClient) {
      const existingClasses = await ClassModel.count({ where: { client_id: defaultClient.id, is_deleted: false } });
      if (existingClasses === 0) {
        const class8A = await ClassModel.create({
          client_id: defaultClient.id,
          name: 'Grade 8',
          division: 'A',
          academic_year: '2025–2026',
          room_number: 'Room 8A',
          capacity: 40,
          status: 'active',
        });
        await ClassModel.create({
          client_id: defaultClient.id,
          name: 'Grade 8',
          division: 'B',
          academic_year: '2025–2026',
          room_number: 'Room 8B',
          capacity: 40,
          status: 'active',
        });
        await ClassModel.create({
          client_id: defaultClient.id,
          name: 'Grade 9',
          division: 'A',
          academic_year: '2025–2026',
          room_number: 'Room 9A',
          capacity: 38,
          status: 'active',
        });
        logger.info('MasterData: Seeded sample classes');

        // Seed Sample Teachers
        const teacher1 = await Teacher.create({
          client_id: defaultClient.id,
          user_id: seededUserMap[ROLES.TEACHER]?.id || null,
          employee_id: 'NEMST014',
          first_name: 'Riya',
          last_name: 'Sharma',
          email: 'teacher@nems.platform',
          phone: '+919777777777',
          qualification: 'M.A., B.Ed.',
          specialization: 'English',
          status: 'active',
        });

        const teacher2 = await Teacher.create({
          client_id: defaultClient.id,
          employee_id: 'NEMST009',
          first_name: 'Ajay',
          last_name: 'Patil',
          email: 'ajay.patil@nems.platform',
          phone: '+919777777778',
          qualification: 'M.Sc., B.Ed.',
          specialization: 'Mathematics',
          status: 'active',
        });
        logger.info('MasterData: Seeded sample teachers');

        // Seed Sample Subjects
        await Subject.create({
          client_id: defaultClient.id,
          class_id: class8A.id,
          name: 'English Literature',
          code: 'ENG801',
          teacher_id: teacher1.id,
          credits: 4,
          status: 'active',
        });

        await Subject.create({
          client_id: defaultClient.id,
          class_id: class8A.id,
          name: 'Mathematics',
          code: 'MATH801',
          teacher_id: teacher2.id,
          credits: 5,
          status: 'active',
        });
        logger.info('MasterData: Seeded sample subjects');

        // Seed Sample Students
        await Student.create({
          client_id: defaultClient.id,
          user_id: seededUserMap[ROLES.STUDENT]?.id || null,
          enrollment_number: 'NEMS-STD-104',
          first_name: 'Aarav',
          last_name: 'Sharma',
          email: 'student@nems.platform',
          phone: '+919666666666',
          roll_number: '01',
          class_id: class8A.id,
          class_name: 'Grade 8',
          division: 'A',
          status: 'active',
        });

        await Student.create({
          client_id: defaultClient.id,
          enrollment_number: 'NEMS-STD-105',
          first_name: 'Aditi',
          last_name: 'Deshmukh',
          email: 'aditi.deshmukh@nems.platform',
          phone: '+919666666667',
          roll_number: '02',
          class_id: class8A.id,
          class_name: 'Grade 8',
          division: 'A',
          status: 'active',
        });

        await Student.create({
          client_id: defaultClient.id,
          enrollment_number: 'NEMS-STD-106',
          first_name: 'Aniket',
          last_name: 'Patil',
          email: 'aniket.patil@nems.platform',
          phone: '+919666666668',
          roll_number: '03',
          class_id: class8A.id,
          class_name: 'Grade 8',
          division: 'A',
          status: 'active',
        });
        logger.info('MasterData: Seeded sample students');
      }
    }

    logger.info('MasterData: Seeding completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'MasterData: Error occurred during master data initialization');
  }
}

export default createMasterData;
