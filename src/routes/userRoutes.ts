import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation middleware
const createUserValidation = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('firstName').notEmpty().withMessage('Le prénom est requis'),
  body('lastName').notEmpty().withMessage('Le nom est requis'),
  body('roleId').optional().isInt().withMessage('Role ID doit être un entier'),
];

const updateUserValidation = [
  body('firstName').optional().notEmpty().withMessage('Le prénom ne peut pas être vide'),
  body('lastName').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('roleId').optional().isInt().withMessage('Role ID doit être un entier'),
  body('isActive').optional().isBoolean().withMessage('isActive doit être un boolean'),
];

// Routes
router.get('/', authenticate, requirePermission('users:read'), getUsers);
router.get('/:id', authenticate, requirePermission('users:read'), getUserById);
router.post('/', authenticate, requirePermission('users:create'), createUserValidation, createUser);
router.put('/:id', authenticate, requirePermission('users:update'), updateUserValidation, updateUser);
router.delete('/:id', authenticate, requirePermission('users:delete'), deleteUser);

export default router;
