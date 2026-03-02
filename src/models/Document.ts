import { DataTypes, Model, Optional, BelongsToManySetAssociationsMixin } from 'sequelize';
import { sequelize } from '../config/database';
import { Tag } from './Tag';

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';

interface DocumentAttributes {
  id: number;
  title: string;
  filename: string;
  original_name: string;
  mime_type: string;
  extension: string;
  size: number;
  path: string;
  checksum: string | null;
  category_id: number | null;
  uploaded_by: number;
  status: DocumentStatus;
  is_archived: boolean;
  is_deleted: boolean;
  deleted_at: Date | null;
  archived_at: Date | null;
  ocr_text: string | null;
  metadata: object | null;
  created_at?: Date;
  updated_at?: Date;
}

interface DocumentCreationAttributes extends Optional<DocumentAttributes, 'id' | 'checksum' | 'status' | 'is_archived' | 'is_deleted' | 'deleted_at' | 'archived_at' | 'ocr_text' | 'metadata'> {}

export class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
  public id!: number;
  public title!: string;
  public filename!: string;
  public original_name!: string;
  public mime_type!: string;
  public extension!: string;
  public size!: number;
  public path!: string;
  public checksum!: string | null;
  public category_id!: number | null;
  public uploaded_by!: number;
  public status!: DocumentStatus;
  public is_archived!: boolean;
  public is_deleted!: boolean;
  public deleted_at!: Date | null;
  public archived_at!: Date | null;
  public ocr_text!: string | null;
  public metadata!: object | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Sequelize association mixins for Many-to-Many with Tag
  public setTags!: BelongsToManySetAssociationsMixin<Tag, number>;
  public getTags!: () => Promise<Tag[]>;
  public addTag!: (tag: Tag | number) => Promise<void>;
  public removeTag!: (tag: Tag | number) => Promise<void>;
}

Document.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
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
    extension: {
      type: DataTypes.STRING(20),
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
    checksum: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'archived'),
      defaultValue: 'draft',
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    archived_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ocr_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    indexes: [
      { fields: ['category_id'] },
      { fields: ['uploaded_by'] },
      { fields: ['status'] },
      { fields: ['is_archived'] },
      { fields: ['is_deleted'] },
      { fields: ['created_at'] },
    ],
  }
);
