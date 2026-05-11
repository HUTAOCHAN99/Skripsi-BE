import { Router } from 'express';
import {
  createPengajuan,
  getPengajuanByMahasiswa,
  getAllPengajuan,
  approvePengajuan,
  rejectPengajuan
} from '../controllers/pengajuanController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('MAHASISWA'), createPengajuan);
router.get('/me', authenticate, authorize('MAHASISWA'), getPengajuanByMahasiswa);
router.get('/', authenticate, authorize('ADMIN', 'DOSEN'), getAllPengajuan);
router.put('/:id/approve', authenticate, authorize('ADMIN', 'DOSEN'), approvePengajuan);
router.put('/:id/reject', authenticate, authorize('ADMIN', 'DOSEN'), rejectPengajuan);

export default router;