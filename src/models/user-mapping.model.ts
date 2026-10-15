import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import User from './user.model';
import Client from './client.model';
import Role from './role.model';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';

export class UserMapping extends Model {
  declare id: string;
  declare user_id: string;
  declare client_id: string;
  declare role_id: string | null;
  declare status: 'active' | 'inactive' | 'pending' | 'blocked';
  declare employee_id: string | null;
  declare joining_date: Date | null;
  declare official_email: string | null;
  declare designation: string | null;
  declare manager_id: string | null;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  declare user?: User;
  declare client?: Client;
  declare role?: Role;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<UserMapping> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        client_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'clients',
            key: 'id',
          },
        },
        role_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'roles',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'pending', 'blocked'),
          defaultValue: 'active',
          allowNull: false,
        },
        employee_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        joining_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        official_email: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        designation: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        manager_id: {
          type: DataTypes.UUID,
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
        tableName: 'user_mappings',
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

export default UserMapping;
