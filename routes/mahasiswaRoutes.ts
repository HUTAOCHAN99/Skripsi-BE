import { Router } from 'express';
import {
  getAllMahasiswa,
  getMahasiswaById,
  createMahasiswa,
  updateMahasiswa,
  deleteMahasiswa
} from '../controllers/mahasiswaController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Semua endpoint hanya untuk ADMIN
router.get('/', authenticate, authorize('ADMIN'), getAllMahasiswa);
router.get('/:id', authenticate, authorize('ADMIN'), getMahasiswaById);
router.post('/', authenticate, authorize('ADMIN'), createMahasiswa);
router.put('/:id', authenticate, authorize('ADMIN'), updateMahasiswa);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteMahasiswa);

export default router;