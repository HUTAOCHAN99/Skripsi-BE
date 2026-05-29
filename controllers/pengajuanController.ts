import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Helper function untuk mendapatkan ID dari params
const getParamId = (id: string | string[] | undefined): string | null => {
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
};

// ============ MAHASISWA ============
// Mahasiswa mengajukan judul
export const createPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const { judul, abstrak } = req.body;
    const userId = req.user?.userId;
    
    if (!judul) {
      return res.status(400).json({ error: 'Judul wajib diisi' });
    }
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    // Cek apakah sudah ada pengajuan yang PENDING
    const existingPending = await prisma.pengajuanJudul.findFirst({
      where: {
        mahasiswaId: mahasiswa.id,
        status: 'PENDING'
      }
    });
    
    if (existingPending) {
      return res.status(400).json({ error: 'Anda masih memiliki pengajuan yang menunggu persetujuan' });
    }
    
    const pengajuan = await prisma.pengajuanJudul.create({
      data: {
        mahasiswaId: mahasiswa.id,
        judul,
        abstrak: abstrak || null,
        status: 'PENDING',
        tglAjukan: new Date()
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Pengajuan judul berhasil dikirim',
      data: pengajuan
    });
  } catch (error) {
    console.error('Create pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mahasiswa melihat pengajuannya sendiri
export const getPengajuanByMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const pengajuan = await prisma.pengajuanJudul.findMany({
      where: { mahasiswaId: mahasiswa.id },
      include: {
        dosenPembimbing: {
          select: {
            id: true,
            nama: true,
            nip: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: pengajuan
    });
  } catch (error) {
    console.error('Get pengajuan by mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ ADMIN & DOSEN ============
// Admin & Dosen melihat semua pengajuan (Admin: untuk approve, Dosen: untuk monitoring)
export const getAllPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    
    let pengajuan;
    
    if (userRole === 'ADMIN') {
      // Admin melihat SEMUA pengajuan (untuk di-approve/reject)
      pengajuan = await prisma.pengajuanJudul.findMany({
        include: {
          mahasiswa: {
            select: {
              id: true,
              nama: true,
              nim: true,
              angkatan: true
            }
          },
          dosenPembimbing: {
            select: {
              id: true,
              nama: true,
              nip: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (userRole === 'DOSEN') {
      // Dosen hanya melihat pengajuan yang sudah disetujui (untuk monitoring)
      pengajuan = await prisma.pengajuanJudul.findMany({
        where: {
          status: 'APPROVED',
          dosenPembimbingId: {
            not: null
          }
        },
        include: {
          mahasiswa: {
            select: {
              id: true,
              nama: true,
              nim: true,
              angkatan: true
            }
          },
          dosenPembimbing: {
            select: {
              id: true,
              nama: true,
              nip: true
            }
          }
        },
        orderBy: { tglApproved: 'desc' }
      });
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json({
      success: true,
      data: pengajuan
    });
  } catch (error) {
    console.error('Get all pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ HANYA ADMIN ============
// Admin menyetujui pengajuan judul
export const approvePengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID pengajuan tidak valid' });
    }
    
    const { dosenPembimbingId, catatan } = req.body;
    const userRole = req.user?.role;
    
    // ✅ VALIDASI: Hanya ADMIN yang bisa approve
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Hanya admin yang berwenang menyetujui pengajuan judul' 
      });
    }
    
    // Wajib pilih dosen pembimbing
    if (!dosenPembimbingId) {
      return res.status(400).json({ error: 'Dosen pembimbing wajib dipilih' });
    }
    
    // Cek apakah dosen ada
    const dosen = await prisma.dosen.findUnique({
      where: { id: dosenPembimbingId }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen pembimbing tidak ditemukan' });
    }
    
    // Cek apakah pengajuan ada
    const pengajuan = await prisma.pengajuanJudul.findUnique({
      where: { id },
      include: {
        mahasiswa: true
      }
    });
    
    if (!pengajuan) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }
    
    // Cek apakah pengajuan sudah diproses
    if (pengajuan.status !== 'PENDING') {
      return res.status(400).json({ error: `Pengajuan sudah ${pengajuan.status.toLowerCase()}` });
    }
    
    // Cek kuota dosen
    if (dosen.terisi >= dosen.kuota) {
      return res.status(400).json({ error: `Kuota bimbingan dosen ${dosen.nama} sudah penuh (${dosen.kuota}/${dosen.kuota})` });
    }
    
    // Approve pengajuan
    const updated = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'APPROVED',
        dosenPembimbingId: dosen.id,
        catatan: catatan || null,
        tglApproved: new Date()
      }
    });
    
    // Update kuota terisi dosen
    await prisma.dosen.update({
      where: { id: dosen.id },
      data: { terisi: { increment: 1 } }
    });
    
    res.json({
      success: true,
      message: `Pengajuan judul berhasil disetujui dengan dosen pembimbing ${dosen.nama}`,
      data: updated
    });
  } catch (error) {
    console.error('Approve pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin menolak pengajuan judul
export const rejectPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID pengajuan tidak valid' });
    }
    
    const { catatan } = req.body;
    const userRole = req.user?.role;
    
    // ✅ VALIDASI: Hanya ADMIN yang bisa reject
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Hanya admin yang berwenang menolak pengajuan judul' 
      });
    }
    
    // Wajib ada catatan penolakan
    if (!catatan) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi' });
    }
    
    // Cek apakah pengajuan ada
    const pengajuan = await prisma.pengajuanJudul.findUnique({
      where: { id }
    });
    
    if (!pengajuan) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }
    
    // Cek apakah pengajuan sudah diproses
    if (pengajuan.status !== 'PENDING') {
      return res.status(400).json({ error: `Pengajuan sudah ${pengajuan.status.toLowerCase()}` });
    }
    
    // Reject pengajuan
    const updated = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'REJECTED',
        catatan: catatan,
        tglApproved: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Pengajuan judul ditolak',
      data: updated
    });
  } catch (error) {
    console.error('Reject pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin assign ulang dosen pembimbing (untuk pengajuan yang sudah approved)
export const reassignDosenPembimbing = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID pengajuan tidak valid' });
    }
    
    const { dosenPembimbingId } = req.body;
    const userRole = req.user?.role;
    
    // Hanya ADMIN yang bisa reassign
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Hanya admin yang dapat mengassign ulang dosen pembimbing' });
    }
    
    if (!dosenPembimbingId) {
      return res.status(400).json({ error: 'Dosen pembimbing wajib dipilih' });
    }
    
    // Cek apakah dosen ada
    const dosenBaru = await prisma.dosen.findUnique({
      where: { id: dosenPembimbingId }
    });
    
    if (!dosenBaru) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    // Cek apakah pengajuan ada dan sudah approved
    const pengajuan = await prisma.pengajuanJudul.findUnique({
      where: { id }
    });
    
    if (!pengajuan) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }
    
    if (pengajuan.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Hanya pengajuan yang sudah disetujui yang bisa diubah dosen pembimbingnya' });
    }
    
    // Kurangi kuota dosen lama jika ada
    if (pengajuan.dosenPembimbingId) {
      await prisma.dosen.update({
        where: { id: pengajuan.dosenPembimbingId },
        data: { terisi: { decrement: 1 } }
      });
    }
    
    // Update dosen pembimbing
    const updated = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        dosenPembimbingId: dosenPembimbingId
      }
    });
    
    // Tambah kuota dosen baru
    await prisma.dosen.update({
      where: { id: dosenPembimbingId },
      data: { terisi: { increment: 1 } }
    });
    
    res.json({
      success: true,
      message: `Dosen pembimbing berhasil diubah menjadi ${dosenBaru.nama}`,
      data: updated
    });
  } catch (error) {
    console.error('Reassign dosen error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};