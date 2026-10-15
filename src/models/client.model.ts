import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';

export class Client extends Model {
  declare id: string;
  declare orgn_details: any;
  declare primary_info: any;
  declare admin_details: any;
  declare status: 'active' | 'inactive' | 'pending';
  declare country?: string;
  declare timezone?: string;
  declare language?: string;
  declare parent_orgn_id?: string | null;
  declare custom_fields?: any;
  declare is_deleted: boolean;
  declare created_by?: string;
  declare updated_by?: string;
  declare created_at: Date;
  declare updated_at: Date;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<Client> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        orgn_details: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        primary_info: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        admin_details: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'pending'),
          defaultValue: 'active',
          allowNull: false,
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        timezone: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        language: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        parent_orgn_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        custom_fields: {
          type: DataTypes.JSON,
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
        tableName: 'clients',
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

export default Client;
