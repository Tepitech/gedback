import { Router } from 'express';
import { search, advancedSearch } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, search);
router.get('/advanced', authenticate, advancedSearch);

export default router;
