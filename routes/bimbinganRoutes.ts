import { Router } from 'express';
import {
  createLogBimbingan,
  getLogBimbinganByMahasiswa,
  getAllLogBimbingan,
  approveLogBimbingan,
  rejectLogBimbingan
} from '../controllers/bimbinganController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('DOSEN'), createLogBimbingan);
router.get('/me', authenticate, authorize('MAHASISWA'), getLogBimbinganByMahasiswa);
router.get('/', authenticate, authorize('ADMIN', 'DOSEN'), getAllLogBimbingan);
router.put('/:id/approve', authenticate, authorize('DOSEN'), approveLogBimbingan);
router.put('/:id/reject', authenticate, authorize('DOSEN'), rejectLogBimbingan);

export default router;