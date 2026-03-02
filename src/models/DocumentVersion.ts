import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DocumentVersionAttributes {
  id: number;
  document_id: number;
  version_number: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  change_description: string | null;
  uploaded_by: number;
  created_at?: Date;
}

interface DocumentVersionCreationAttributes extends Optional<DocumentVersionAttributes, 'id' | 'change_description'> {}

export class DocumentVersion extends Model<DocumentVersionAttributes, DocumentVersionCreationAttributes> implements DocumentVersionAttributes {
  public id!: number;
  public document_id!: number;
  public version_number!: number;
  public filename!: string;
  public original_name!: string;
  public mime_type!: string;
  public size!: number;
  public path!: string;
  public change_description!: string | null;
  public uploaded_by!: number;
  public readonly created_at!: Date;
}

DocumentVersion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    document_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    original_name: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    change_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'DocumentVersion',
    tableName: 'document_versions',
    indexes: [
      { fields: ['document_id'] },
      { fields: ['version_number'] },
    ],
  }
);
