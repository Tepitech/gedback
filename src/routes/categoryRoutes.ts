import { Router } from 'express';
import { 
  getCategories, 
  getCategoryById, 
  getCategoryDocuments,
  createCategory, 
  updateCategory, 
  deleteCategory,
  getCategoryTree,
  reorderCategories
} from '../controllers/categoryController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Routes - IMPORTANT: Specific routes must come before parameterized routes
router.get('/', authenticate, requirePermission('categories:read'), getCategories);
router.get('/tree', authenticate, requirePermission('categories:read'), getCategoryTree);
router.get('/:id/documents', authenticate, requirePermission('categories:read'), getCategoryDocuments);
router.get('/:id', authenticate, requirePermission('categories:read'), getCategoryById);

router.post('/', authenticate, requirePermission('categories:create'), createCategory);
router.put('/:id', authenticate, requirePermission('categories:update'), updateCategory);
router.delete('/:id', authenticate, requirePermission('categories:delete'), deleteCategory);
router.post('/reorder', authenticate, requirePermission('categories:update'), reorderCategories);

export default router;
