import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';

export class User extends Model {
  declare id: string;
  declare first_name: string;
  declare middle_name: string | null;
  declare last_name: string;
  declare email: string;
  declare phone: string;
  declare password: string | null;
  declare status: 'active' | 'inactive' | 'locked' | 'blocked' | 'pending';
  declare gender: 'Male' | 'Female' | 'Other' | null;
  declare date_of_birth: Date | null;
  declare profile_image: string | null;
  declare country_code: string;
  declare token_version: number;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<User> {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        first_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        middle_name: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        last_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'locked', 'blocked', 'pending'),
          defaultValue: 'active',
          allowNull: false,
        },
        gender: {
          type: DataTypes.ENUM('Male', 'Female', 'Other'),
          allowNull: true,
        },
        date_of_birth: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        profile_image: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        country_code: {
          type: DataTypes.STRING(10),
          defaultValue: '+91',
        },
        token_version: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
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
        tableName: 'users',
        timestamps: false,
        hooks: {
          beforeValidate: (instance) => {
            convertEmptyStringsToNull(instance);
          },
          beforeSave: (instance) => {
            beforeSave(instance);
          },
          beforeCreate: async (user: User) => {
            if (user.password && !user.password.startsWith('$2b$')) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
            }
          },
          beforeUpdate: async (user: User) => {
            if (user.changed('password') && user.password && !user.password.startsWith('$2b$')) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
            }
          },
        },
      }
    );
  }
}

export default User;
