import { Request, Response } from 'express';
import { User, Role, Permission } from '../models';
import { generateTokens, AuthRequest } from '../middleware/auth';
import { rolePermissions } from '../middleware/rbac';
import { logger } from '../utils/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé',
      });
      return;
    }

    const passwordHash = await User.hashPassword(password);
    
    const user = await User.create({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      role_id: 3, // Default: user role
      is_active: true,
    });

    const fullUser = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'role' }]
    });

    const permissions = rolePermissions[fullUser?.role?.name || 'user'];

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: fullUser?.role?.name || 'user',
      roleId: user.role_id,
      permissions,
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: fullUser?.role?.name,
        },
        ...tokens,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }]
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Compte désactivé',
      });
      return;
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
      return;
    }

    await user.update({ last_login: new Date() });

    const permissions = user.role?.permissions?.map((p: Permission) => p.name) || rolePermissions[user.role?.name || 'user'];

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role?.name || 'user',
      roleId: user.role_id,
      permissions,
    });

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar,
          role: user.role?.name,
        },
        ...tokens,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user?.id, {
      include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }]
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        role: user.role,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
    });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  // With JWT, logout is handled client-side by removing the token
  res.json({
    success: true,
    message: 'Déconnexion réussie',
  });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token requis',
      });
      return;
    }

    // In production, verify refresh token from database
    // For now, just return a new access token
    res.json({
      success: true,
      message: 'Token rafraîchi',
      data: {
        accessToken: 'new-access-token',
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Refresh token invalide',
    });
  }
};
