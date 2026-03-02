import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { User, Role, Permission } from '../models';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    roleId: number;
    permissions: string[];
  };
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  roleId: number;
  permissions: string[];
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check Authorization header first, then query param token
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await User.findByPk(decoded.userId, {
      include: [
        { model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }
      ]
    });

    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif',
      });
      return;
    }

    const permissions = user.role?.permissions?.map(p => p.name) || [];

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role?.name || 'user',
      roleId: user.role_id,
      permissions,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expiré',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token invalide',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification',
    });
  }
};

export const generateTokens = (payload: {
  userId: number;
  email: string;
  role: string;
  roleId: number;
  permissions: string[];
}): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any
  } as SignOptions);

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as any } as SignOptions
  );

  return { accessToken, refreshToken };
};
