import { Router } from 'express';
import {
  createJadwalSidang,
  getAllJadwalSidang,
  getJadwalSidangByMahasiswa,
  updateJadwalSidang,
  cancelJadwalSidang
} from '../controllers/sidangController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('ADMIN'), createJadwalSidang);
router.get('/', authenticate, authorize('ADMIN', 'DOSEN'), getAllJadwalSidang);
router.get('/me', authenticate, authorize('MAHASISWA'), getJadwalSidangByMahasiswa);
router.put('/:id', authenticate, authorize('ADMIN'), updateJadwalSidang);
router.put('/:id/cancel', authenticate, authorize('ADMIN'), cancelJadwalSidang);

export default router;