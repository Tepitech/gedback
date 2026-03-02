import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AuditLogAttributes {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: object | null;
  new_values: object | null;
  ip_address: string | null;
  user_agent: string | null;
  description: string | null;
  created_at?: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'old_values' | 'new_values' | 'ip_address' | 'user_agent' | 'description'> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: number;
  public user_id!: number | null;
  public action!: string;
  public entity_type!: string;
  public entity_id!: number | null;
  public old_values!: object | null;
  public new_values!: object | null;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public description!: string | null;
  public readonly created_at!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    old_values: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = (this as any).getDataValue('old_values');
        if (rawValue === null || rawValue === undefined) {
          return null;
        }
        try {
          return JSON.parse(rawValue);
        } catch {
          return rawValue;
        }
      },
      set(value: any) {
        if (value === null || value === undefined) {
          (this as any).setDataValue('old_values', null);
        } else if (typeof value === 'string') {
          (this as any).setDataValue('old_values', value);
        } else {
          (this as any).setDataValue('old_values', JSON.stringify(value));
        }
      },
    },
    new_values: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = (this as any).getDataValue('new_values');
        if (rawValue === null || rawValue === undefined) {
          return null;
        }
        try {
          return JSON.parse(rawValue);
        } catch {
          return rawValue;
        }
      },
      set(value: any) {
        if (value === null || value === undefined) {
          (this as any).setDataValue('new_values', null);
        } else if (typeof value === 'string') {
          (this as any).setDataValue('new_values', value);
        } else {
          (this as any).setDataValue('new_values', JSON.stringify(value));
        }
      },
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['created_at'] },
    ],
  }
);
