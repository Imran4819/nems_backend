import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';

export class Permission extends Model {
  declare id: string;
  declare name: string;
  declare code: string;
  declare category: string;
  declare description: string | null;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<Permission> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        category: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'permissions',
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

export default Permission;
