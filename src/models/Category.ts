import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface CategoryAttributes {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  path: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_by: number;
  is_system: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'parent_id' | 'description' | 'icon' | 'color' | 'sort_order' | 'is_system'> {}

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public parent_id!: number | null;
  public description!: string | null;
  public path!: string;
  public icon!: string | null;
  public color!: string | null;
  public sort_order!: number;
  public created_by!: number;
  public is_system!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    path: {
      type: DataTypes.STRING(1000),
      defaultValue: '/',
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    indexes: [
      { fields: ['parent_id'] },
      { fields: ['path'] },
      { fields: ['name'] },
    ],
  }
);
