import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Client from '../models/client.model';
import Role from '../models/role.model';
import User from '../models/user.model';
import UserMapping from '../models/user-mapping.model';
import Permission from '../models/permission.model';
import RolePermission from '../models/role-permission.model';
import Action from '../models/action.model';
import RolePermissionAction from '../models/role-permission-action.model';
import Student from '../models/student.model';
import Teacher from '../models/teacher.model';
import ClassModel from '../models/class.model';
import Subject from '../models/subject.model';
import Attendance from '../models/attendance.model';
import Timetable from '../models/timetable.model';
import logger from './logger-plugins';

declare module 'fastify' {
  interface FastifyInstance {
    models: {
      Client: typeof Client;
      Role: typeof Role;
      User: typeof User;
      UserMapping: typeof UserMapping;
      Permission: typeof Permission;
      RolePermission: typeof RolePermission;
      Action: typeof Action;
      RolePermissionAction: typeof RolePermissionAction;
      Student: typeof Student;
      Teacher: typeof Teacher;
      ClassModel: typeof ClassModel;
      Subject: typeof Subject;
      Attendance: typeof Attendance;
      Timetable: typeof Timetable;
    };
  }
}

const modelInitializationPlugin: FastifyPluginAsync = fp(async (fastify) => {
  logger.info('Initializing Sequelize models and associations...');
  const sequelize = fastify.sequelize;

  // Initialize models
  Client.initModel(sequelize);
  Role.initModel(sequelize);
  User.initModel(sequelize);
  UserMapping.initModel(sequelize);
  Permission.initModel(sequelize);
  RolePermission.initModel(sequelize);
  Action.initModel(sequelize);
  RolePermissionAction.initModel(sequelize);
  Student.initModel(sequelize);
  Teacher.initModel(sequelize);
  ClassModel.initModel(sequelize);
  Subject.initModel(sequelize);
  Attendance.initModel(sequelize);
  Timetable.initModel(sequelize);

  // Set up Associations
  // Client associations
  Client.hasMany(UserMapping, { foreignKey: 'client_id', as: 'user_mappings' });
  Client.hasMany(Role, { foreignKey: 'client_id', as: 'roles' });
  Client.hasMany(Student, { foreignKey: 'client_id', as: 'students' });
  Client.hasMany(Teacher, { foreignKey: 'client_id', as: 'teachers' });
  Client.hasMany(ClassModel, { foreignKey: 'client_id', as: 'classes' });
  Client.hasMany(Subject, { foreignKey: 'client_id', as: 'subjects' });
  Client.hasMany(Attendance, { foreignKey: 'client_id', as: 'attendances' });
  Client.hasMany(Timetable, { foreignKey: 'client_id', as: 'timetables' });

  // User associations
  User.hasMany(UserMapping, { foreignKey: 'user_id', as: 'user_mappings' });
  User.hasOne(Student, { foreignKey: 'user_id', as: 'student_profile' });
  User.hasOne(Teacher, { foreignKey: 'user_id', as: 'teacher_profile' });

  // Role associations
  Role.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Role.hasMany(UserMapping, { foreignKey: 'role_id', as: 'user_mappings' });
  Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'role_permissions' });

  // UserMapping associations
  UserMapping.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserMapping.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  UserMapping.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

  // Student associations
  Student.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Student.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
  Student.hasMany(Attendance, { foreignKey: 'student_id', as: 'attendances' });

  // Teacher associations
  Teacher.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Teacher.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Teacher.hasMany(Student, { foreignKey: 'teacher_id', as: 'students' });
  Teacher.hasMany(Subject, { foreignKey: 'teacher_id', as: 'subjects' });
  Teacher.hasMany(ClassModel, { foreignKey: 'class_teacher_id', as: 'classes_taught' });
  Teacher.hasMany(Attendance, { foreignKey: 'teacher_id', as: 'attendances' });

  // Class associations
  ClassModel.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  ClassModel.belongsTo(Teacher, { foreignKey: 'class_teacher_id', as: 'class_teacher' });
  ClassModel.hasMany(Subject, { foreignKey: 'class_id', as: 'subjects' });
  ClassModel.hasMany(Attendance, { foreignKey: 'class_id', as: 'attendances' });

  // Subject associations
  Subject.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Subject.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
  Subject.belongsTo(ClassModel, { foreignKey: 'class_id', as: 'class' });
  Subject.hasMany(Attendance, { foreignKey: 'subject_id', as: 'attendances' });

  // Attendance associations
  Attendance.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Attendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
  Attendance.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
  Attendance.belongsTo(ClassModel, { foreignKey: 'class_id', as: 'class' });
  Attendance.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

  // Timetable associations
  Timetable.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Timetable.belongsTo(ClassModel, { foreignKey: 'class_id', as: 'class' });
  Timetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
  Timetable.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
  ClassModel.hasMany(Timetable, { foreignKey: 'class_id', as: 'timetables' });
  Subject.hasMany(Timetable, { foreignKey: 'subject_id', as: 'timetables' });
  Teacher.hasMany(Timetable, { foreignKey: 'teacher_id', as: 'timetables' });

  // RolePermission & Permission associations
  RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
  Permission.hasMany(RolePermission, { foreignKey: 'permission_id', as: 'role_permissions' });

  RolePermission.hasMany(RolePermissionAction, { foreignKey: 'role_permission_id', as: 'actions' });
  RolePermissionAction.belongsTo(Action, { foreignKey: 'action_id', as: 'action_details' });

  fastify.decorate('models', {
    Client,
    Role,
    User,
    UserMapping,
    Permission,
    RolePermission,
    Action,
    RolePermissionAction,
    Student,
    Teacher,
    ClassModel,
    Subject,
    Attendance,
    Timetable,
  });

  logger.info('Models and associations successfully initialized');
});

export default modelInitializationPlugin;
