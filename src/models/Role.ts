import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Permission } from './Permission';

interface RoleAttributes {
  id: number;
  name: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'description'> {}

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association properties
  public readonly permissions?: Permission[];
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    indexes: [
      { fields: ['name'] },
    ],
  }
);
