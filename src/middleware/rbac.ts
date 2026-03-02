import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export type Permission = 
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'documents:read' | 'documents:create' | 'documents:update' | 'documents:delete' | 'documents:approve' | 'documents:download' | 'documents:preview'
  | 'categories:read' | 'categories:create' | 'categories:update' | 'categories:delete'
  | 'audit:read'
  | 'settings:manage';

export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentification requise',
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission requise pour cette action',
      });
      return;
    }

    next();
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentification requise',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Rôle insuffisant pour cette action',
      });
      return;
    }

    next();
  };
};

// Matrice des permissions par rôle
export const rolePermissions: Record<string, Permission[]> = {
  admin: [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:approve', 'documents:download', 'documents:preview',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'audit:read',
    'settings:manage',
  ],
  manager: [
    'users:read',
    'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:approve', 'documents:download', 'documents:preview',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'audit:read',
  ],
  user: [
    'documents:read', 'documents:create', 'documents:update', 'documents:download', 'documents:preview',
    'categories:read',
  ],
  guest: [
    'documents:read', 'documents:preview',
  ],
};
