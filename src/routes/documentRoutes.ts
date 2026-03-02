import { Router } from 'express';
import { 
  getDocuments, 
  getDocumentById, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  restoreDocument,
  archiveDocument,
  approveDocument,
  rejectDocument,
  getDocumentVersions,
  downloadDocument,
  previewDocument,
  getStats
} from '../controllers/documentController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

// Stats route (must be before /:id routes)
router.get('/stats', authenticate, requirePermission('documents:read'), getStats);

// Routes
router.get('/', authenticate, requirePermission('documents:read'), getDocuments);
router.get('/:id', authenticate, requirePermission('documents:read'), getDocumentById);
router.get('/:id/versions', authenticate, requirePermission('documents:read'), getDocumentVersions);
router.get('/:id/download', authenticate, requirePermission('documents:download'), downloadDocument);
router.get('/:id/preview', authenticate, requirePermission('documents:read'), previewDocument);

router.post('/', 
  authenticate, 
  requirePermission('documents:create'), 
  upload.single('file'), 
  createDocument
);

router.put('/:id', authenticate, requirePermission('documents:update'), updateDocument);
router.delete('/:id', authenticate, requirePermission('documents:delete'), deleteDocument);
router.post('/:id/restore', authenticate, requirePermission('documents:update'), restoreDocument);
router.post('/:id/archive', authenticate, requirePermission('documents:update'), archiveDocument);
router.post('/:id/approve', authenticate, requirePermission('documents:approve'), approveDocument);
router.post('/:id/reject', authenticate, requirePermission('documents:approve'), rejectDocument);

export default router;
