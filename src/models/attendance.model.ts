import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import Client from './client.model';
import Student from './student.model';
import Teacher from './teacher.model';
import ClassModel from './class.model';
import Subject from './subject.model';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';
import { AttendanceStatus, AttendanceUserType } from '../interfaces/attendance.interface';

export class Attendance extends Model {
  declare id: string;
  declare client_id: string;
  declare user_type: AttendanceUserType;
  declare student_id: string | null;
  declare teacher_id: string | null;
  declare class_id: string | null;
  declare subject_id: string | null;
  declare date: Date | string;
  declare status: AttendanceStatus;
  declare check_in_time: string | null;
  declare check_out_time: string | null;
  declare late_minutes: number | null;
  declare marked_by: string | null;
  declare remark: string | null;
  declare metadata: Record<string, any> | null;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  declare client?: Client;
  declare student?: Student;
  declare teacher?: Teacher;
  declare class?: ClassModel;
  declare subject?: Subject;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<Attendance> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        client_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'clients',
            key: 'id',
          },
        },
        user_type: {
          type: DataTypes.ENUM('student', 'teacher'),
          allowNull: false,
        },
        student_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'students',
            key: 'id',
          },
        },
        teacher_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id',
          },
        },
        class_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'classes',
            key: 'id',
          },
        },
        subject_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'subjects',
            key: 'id',
          },
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'excused', 'on_leave'),
          defaultValue: 'present',
          allowNull: false,
        },
        check_in_time: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        check_out_time: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        late_minutes: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        marked_by: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        remark: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        is_deleted: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        updated_by: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'attendances',
        timestamps: false,
        hooks: {
          beforeValidate: (instance) => {
            convertEmptyStringsToNull(instance);
          },
          beforeSave: (instance) => {
            beforeSave(instance);
          },
        },
      }
    );
  }
}

export default Attendance;
