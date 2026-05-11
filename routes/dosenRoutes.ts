import { Router } from 'express';
import {
  getAllDosen,
  getDosenById,
  createDosen,
  updateDosen,
  deleteDosen
} from '../controllers/dosenController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), getAllDosen);
router.get('/:id', authenticate, authorize('ADMIN'), getDosenById);
router.post('/', authenticate, authorize('ADMIN'), createDosen);
router.put('/:id', authenticate, authorize('ADMIN'), updateDosen);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDosen);

export default router;