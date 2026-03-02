import { User } from './User';
import { Role } from './Role';
import { Permission } from './Permission';
import { Category } from './Category';
import { Document } from './Document';
import { DocumentVersion } from './DocumentVersion';
import { Tag } from './Tag';
import { AuditLog } from './AuditLog';
import Notification from './Notification';

// ============================================
// Associations User - Role
// ============================================
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// ============================================
// Associations Role - Permission (Many-to-Many)
// ============================================
Role.belongsToMany(Permission, { 
  through: 'role_permissions', 
  foreignKey: 'role_id', 
  as: 'permissions' 
});
Permission.belongsToMany(Role, { 
  through: 'role_permissions', 
  foreignKey: 'permission_id', 
  as: 'roles' 
});

// ============================================
// Associations Category (Self-referencing)
// ============================================
Category.belongsTo(Category, { 
  foreignKey: 'parent_id', 
  as: 'parent' 
});
Category.hasMany(Category, { 
  foreignKey: 'parent_id', 
  as: 'children' 
});
Category.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});
User.hasMany(Category, { 
  foreignKey: 'created_by', 
  as: 'categories' 
});

// ============================================
// Associations Document
// ============================================
Document.belongsTo(Category, { 
  foreignKey: 'category_id', 
  as: 'category' 
});
Category.hasMany(Document, { 
  foreignKey: 'category_id', 
  as: 'documents' 
});

Document.belongsTo(User, { 
  foreignKey: 'uploaded_by', 
  as: 'uploader' 
});
User.hasMany(Document, { 
  foreignKey: 'uploaded_by', 
  as: 'documents' 
});

// ============================================
// Associations DocumentVersion
// ============================================
DocumentVersion.belongsTo(Document, { 
  foreignKey: 'document_id', 
  as: 'document' 
});
Document.hasMany(DocumentVersion, { 
  foreignKey: 'document_id', 
  as: 'versions' 
});

DocumentVersion.belongsTo(User, { 
  foreignKey: 'uploaded_by', 
  as: 'uploader' 
});

// ============================================
// Associations Document - Tag (Many-to-Many)
// ============================================
Document.belongsToMany(Tag, { 
  through: 'document_tags', 
  foreignKey: 'document_id', 
  as: 'tags' 
});
Tag.belongsToMany(Document, { 
  through: 'document_tags', 
  foreignKey: 'tag_id', 
  as: 'documents' 
});

// ============================================
// Associations AuditLog
// ============================================
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});
User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'auditLogs'
});

// ============================================
// Associations Notification
// ============================================
Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});
User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

// ============================================
// Export models
// ============================================
export {
  User,
  Role,
  Permission,
  Category,
  Document,
  DocumentVersion,
  Tag,
  AuditLog,
  Notification,
};

// ============================================
// Types utilitaires
// ============================================
export interface IUserWithRole extends User {
  role?: Role;
  permissions?: Permission[];
}

export interface IDocumentWithRelations extends Document {
  category?: Category;
  uploader?: User;
  tags?: Tag[];
  versions?: DocumentVersion[];
}
