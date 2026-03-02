import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';
import { Role } from './Role';
import { Permission } from './Permission';

interface UserAttributes {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role_id: number;
  is_active: boolean;
  last_login: Date | null;
  email_verified: boolean;
  verification_token: string | null;
  reset_password_token: string | null;
  reset_password_expires: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'avatar' | 'last_login' | 'email_verified' | 'verification_token' | 'reset_password_token' | 'reset_password_expires' | 'is_active'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password_hash!: string;
  public first_name!: string;
  public last_name!: string;
  public avatar!: string | null;
  public role_id!: number;
  public is_active!: boolean;
  public last_login!: Date | null;
  public email_verified!: boolean;
  public verification_token!: string | null;
  public reset_password_token!: string | null;
  public reset_password_expires!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association properties
  public readonly role?: Role;
  public readonly permissions?: Permission[];

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  public toJSON() {
    const values = { ...this.get() } as Record<string, unknown>;
    delete values.password_hash;
    delete values.verification_token;
    delete values.reset_password_token;
    delete values.reset_password_expires;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['role_id'] },
      { fields: ['is_active'] },
    ],
  }
);
