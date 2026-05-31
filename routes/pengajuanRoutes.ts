import { Router } from 'express';
import {
  createPengajuan,
  getPengajuanByMahasiswa,
  getAllPengajuan,
  approvePengajuan,
  rejectPengajuan,
  assignDosenPembimbing
} from '../controllers/pengajuanController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Mahasiswa: submit judul
router.post('/', authenticate, authorize('MAHASISWA'), createPengajuan);

// Mahasiswa: lihat pengajuannya sendiri
router.get('/me', authenticate, authorize('MAHASISWA'), getPengajuanByMahasiswa);

// Admin: semua pengajuan. Dosen: hanya pengajuan yang diassign kepadanya.
router.get('/', authenticate, authorize('ADMIN', 'DOSEN'), getAllPengajuan);

// Admin hanya assign dosen. Assign tidak otomatis approve judul.
router.put('/:id/assign-dosen', authenticate, authorize('ADMIN'), assignDosenPembimbing);

// Dosen yang diassign berwenang approve/reject judul.
router.put('/:id/approve', authenticate, authorize('DOSEN'), approvePengajuan);
router.put('/:id/reject', authenticate, authorize('DOSEN'), rejectPengajuan);

export default router;
