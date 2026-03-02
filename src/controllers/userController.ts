import { Response } from 'express';
import { User, Role, AuditLog } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
      ];
    }
    if (role) {
      where.role_id = role;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password_hash', 'verification_token', 'reset_password_token'] },
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages: Math.ceil(count / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('GetUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password_hash', 'verification_token', 'reset_password_token'] },
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
      data: user,
    });
  } catch (error) {
    logger.error('GetUserById error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;

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
      role_id: roleId || 3,
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'CREATE',
      entity_type: 'user',
      entity_id: user.id,
      new_values: { email, firstName, lastName, roleId },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Création de l'utilisateur ${email}`,
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
      },
    });
  } catch (error) {
    logger.error('CreateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, roleId, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    const oldValues = {
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: user.role_id,
      isActive: user.is_active,
    };

    await user.update({
      first_name: firstName || user.first_name,
      last_name: lastName || user.last_name,
      role_id: roleId || user.role_id,
      is_active: isActive !== undefined ? isActive : user.is_active,
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: user.id,
      old_values: oldValues,
      new_values: { firstName, lastName, roleId, isActive },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Modification de l'utilisateur ${user.email}`,
    });

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    logger.error('UpdateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    if (user.id === req.user?.id) {
      res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
      return;
    }

    await user.destroy();

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'DELETE',
      entity_type: 'user',
      entity_id: user.id,
      old_values: { email: user.email },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Suppression de l'utilisateur ${user.email}`,
    });

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error) {
    logger.error('DeleteUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur',
    });
  }
};

// Import Op from sequelize
import { Op } from 'sequelize';
