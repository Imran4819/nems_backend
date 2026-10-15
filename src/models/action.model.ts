import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

export class Action extends Model {
  declare id: string;
  declare label: string;
  declare short_code: string;

  static initModel(sequelize: Sequelize): ModelStatic<Action> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        label: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        short_code: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'actions',
        timestamps: false,
      }
    );
  }
}

export default Action;
