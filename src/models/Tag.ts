import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface TagAttributes {
  id: number;
  name: string;
  color: string;
  created_at?: Date;
}

interface TagCreationAttributes extends Optional<TagAttributes, 'id' | 'color'> {}

export class Tag extends Model<TagAttributes, TagCreationAttributes> implements TagAttributes {
  public id!: number;
  public name!: string;
  public color!: string;
  public readonly created_at!: Date;
}

Tag.init(
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
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#6c757d',
    },
  },
  {
    sequelize,
    modelName: 'Tag',
    tableName: 'tags',
    indexes: [
      { fields: ['name'] },
    ],
  }
);
