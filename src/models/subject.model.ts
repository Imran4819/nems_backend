import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import Client from './client.model';
import ClassModel from './class.model';
import Teacher from './teacher.model';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';

export class Subject extends Model {
  declare id: string;
  declare client_id: string;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare class_id: string | null;
  declare teacher_id: string | null; // Teacher foreign key
  declare credits: number | null;
  declare total_marks: number | null;
  declare passing_marks: number | null;
  declare is_elective: boolean;
  declare status: 'active' | 'inactive';
  declare metadata: Record<string, any> | null;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  declare client?: Client;
  declare class?: ClassModel;
  declare teacher?: Teacher;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<Subject> {
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
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        class_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'classes',
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
        credits: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        total_marks: {
          type: DataTypes.INTEGER,
          defaultValue: 100,
          allowNull: true,
        },
        passing_marks: {
          type: DataTypes.INTEGER,
          defaultValue: 40,
          allowNull: true,
        },
        is_elective: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive'),
          defaultValue: 'active',
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
        tableName: 'subjects',
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

export default Subject;
