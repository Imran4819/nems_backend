import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

export class RolePermissionAction extends Model {
  declare id: string;
  declare role_permission_id: string;
  declare action_id: string;
  declare client_id: string | null;

  static initModel(sequelize: Sequelize): ModelStatic<RolePermissionAction> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        role_permission_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        action_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        client_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'role_permission_actions',
        timestamps: false,
      }
    );
  }
}

export default RolePermissionAction;
