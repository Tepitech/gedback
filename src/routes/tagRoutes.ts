import { Router } from 'express';
import { getTags, createTag, updateTag, deleteTag } from '../controllers/tagController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, getTags);
router.post('/', authenticate, requirePermission('categories:create'), createTag);
router.put('/:id', authenticate, requirePermission('categories:update'), updateTag);
router.delete('/:id', authenticate, requirePermission('categories:delete'), deleteTag);

export default router;
