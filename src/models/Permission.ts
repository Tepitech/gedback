import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PermissionAttributes {
  id: number;
  name: string;
  description: string | null;
  created_at?: Date;
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id' | 'description'> {}

export class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public readonly created_at!: Date;
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
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
    modelName: 'Permission',
    tableName: 'permissions',
    indexes: [
      { fields: ['name'] },
    ],
  }
);
