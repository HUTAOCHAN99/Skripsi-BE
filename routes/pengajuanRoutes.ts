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

// Mahasiswa: submit judul
router.post('/', authenticate, authorize('MAHASISWA'), createPengajuan);

// Mahasiswa: lihat pengajuannya sendiri
router.get('/me', authenticate, authorize('MAHASISWA'), getPengajuanByMahasiswa);

// Admin & Dosen: lihat semua pengajuan (tapi beda akses)
router.get('/', authenticate, authorize('ADMIN', 'DOSEN'), getAllPengajuan);

// ⚠️ HANYA DOSEN yang bisa approve/reject (BUKAN Admin!)
router.put('/:id/approve', authenticate, authorize('DOSEN'), approvePengajuan);
router.put('/:id/reject', authenticate, authorize('DOSEN'), rejectPengajuan);

export default router;