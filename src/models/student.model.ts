import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import Client from './client.model';
import User from './user.model';
import Teacher from './teacher.model';
import { convertEmptyStringsToNull } from '../db/hooks/convert_empty_strings_to_null';
import { beforeSave } from '../db/hooks/time_format_hook';
import { StudentAddress } from '../interfaces/student.interface';

export class Student extends Model {
  declare id: string;
  declare client_id: string;
  declare user_id: string | null;
  declare teacher_id: string | null;
  declare enrollment_number: string;
  declare first_name: string;
  declare middle_name: string | null;
  declare last_name: string;
  declare email: string;
  declare phone: string;
  declare gender: 'Male' | 'Female' | 'Other' | null;
  declare date_of_birth: Date | null;
  declare blood_group: string | null;
  declare address: StudentAddress | null;
  declare guardian_name: string | null;
  declare guardian_phone: string | null;
  declare guardian_email: string | null;
  declare guardian_relation: string | null;
  declare academic_year: string | null;
  declare class_name: string | null;
  declare division: string | null;
  declare roll_number: string | null;
  declare admission_date: Date | null;
  declare status: 'active' | 'inactive' | 'graduated' | 'suspended' | 'withdrawn';
  declare profile_image: string | null;
  declare metadata: Record<string, any> | null;
  declare is_deleted: boolean;
  declare created_by: string | null;
  declare updated_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  declare client?: Client;
  declare user?: User;
  declare teacher?: Teacher;

  static associate?: (models: Record<string, ModelStatic<Model>>) => void;

  static initModel(sequelize: Sequelize): ModelStatic<Student> {
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
        user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
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
        enrollment_number: {
          type: DataTypes.STRING(50),
          allowNull: false,
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
        gender: {
          type: DataTypes.ENUM('Male', 'Female', 'Other'),
          allowNull: true,
        },
        date_of_birth: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        blood_group: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
        address: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        guardian_name: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        guardian_phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        guardian_email: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        guardian_relation: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        academic_year: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        class_name: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        division: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        roll_number: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        admission_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'graduated', 'suspended', 'withdrawn'),
          defaultValue: 'active',
          allowNull: false,
        },
        profile_image: {
          type: DataTypes.STRING(255),
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
        tableName: 'students',
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

export default Student;
