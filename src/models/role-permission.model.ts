import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

export class RolePermission extends Model {
  declare id: string;
  declare role_id: string;
  declare permission_id: string;
  declare client_id: string | null;
  declare name?: string;
  declare created_at: Date;
  declare updated_at: Date;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<RolePermission> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        role_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'roles',
            key: 'id',
          },
        },
        permission_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'permissions',
            key: 'id',
          },
        },
        client_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        name: {
          type: DataTypes.STRING(100),
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
        tableName: 'role_permissions',
        timestamps: false,
      }
    );
  }
}

export default RolePermission;
