import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import Client from './client.model';
import ClassModel from './class.model';
import Subject from './subject.model';
import Teacher from './teacher.model';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';
import { DayOfWeek } from '../interfaces/timetable.interface';

export class Timetable extends Model {
  declare id: string;
  declare client_id: string;
  declare academic_year_id: string | null;
  declare academic_year: string | null;
  declare class_id: string;
  declare section_id: string | null;
  declare section: string | null;
  declare day_of_week: DayOfWeek;
  declare period_id: string | null;
  declare period: number | string | null;
  declare start_time: string | null;
  declare end_time: string | null;
  declare subject_id: string;
  declare teacher_id: string;
  declare room_number: string | null;
  declare is_active: boolean;
  declare metadata: Record<string, any> | null;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  declare client?: Client;
  declare class?: ClassModel;
  declare subject?: Subject;
  declare teacher?: Teacher;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<Timetable> {
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
        // FK -> AcademicYear (or string year e.g. "2025-2026")
        academic_year_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        academic_year: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        // FK -> Class
        class_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'classes',
            key: 'id',
          },
        },
        // FK -> Section / Division
        section_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        section: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        // Choice (Monday to Saturday / Sunday)
        day_of_week: {
          type: DataTypes.ENUM(
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ),
          allowNull: false,
        },
        // FK -> Period
        period_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        period: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        start_time: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        end_time: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        // FK -> Subject
        subject_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'subjects',
            key: 'id',
          },
        },
        // FK -> Teacher
        teacher_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'teachers',
            key: 'id',
          },
        },
        room_number: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        // is_active: Yes/No
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
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
        tableName: 'timetables',
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

export default Timetable;
