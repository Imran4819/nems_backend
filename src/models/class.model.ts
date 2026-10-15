import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import Client from './client.model';
import Teacher from './teacher.model';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';

export class ClassModel extends Model {
  declare id: string;
  declare client_id: string;
  declare name: string;
  declare code: string | null;
  declare division: string | null;
  declare academic_year: string | null;
  declare room_number: string | null;
  declare capacity: number | null;
  declare class_teacher_id: string | null;
  declare status: 'active' | 'inactive' | 'archived';
  declare description: string | null;
  declare metadata: Record<string, any> | null;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  declare client?: Client;
  declare class_teacher?: Teacher;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<ClassModel> {
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
          allowNull: true,
        },
        division: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        academic_year: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        room_number: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        capacity: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        class_teacher_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'archived'),
          defaultValue: 'active',
          allowNull: false,
        },
        description: {
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
        tableName: 'classes',
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

export default ClassModel;
