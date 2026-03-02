import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface NotificationAttributes {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'document' | 'approval' | 'system';
  entityType?: string;
  entityId?: number;
  isRead: boolean;
  isEmailSent: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'isRead' | 'isEmailSent'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: number;
  public userId!: number;
  public title!: string;
  public message!: string;
  public type!: 'info' | 'success' | 'warning' | 'error' | 'document' | 'approval' | 'system';
  public entityType?: string;
  public entityId?: number;
  public isRead!: boolean;
  public isEmailSent!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'document', 'approval', 'system'),
      defaultValue: 'info',
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isEmailSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
  }
);

export default Notification;
