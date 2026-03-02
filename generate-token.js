const jwt = require('jsonwebtoken');

const payload = {
  userId: 3,
  email: 'admin@ged.com',
  role: 'admin',
  roleId: 1,
  permissions: [
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'documents:read', 'documents:create', 'documents:update', 'documents:delete',
    'documents:download', 'documents:preview', 'documents:approve',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'audit:read', 'settings:manage'
  ]
};

const token = jwt.sign(payload, 'ged-secret-key-change-in-production', { expiresIn: '24h' });
console.log(token);
