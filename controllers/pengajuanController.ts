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
// Admin & Dosen melihat semua pengajuan (tapi dengan filter berbeda di frontend)
export const getAllPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    
    let pengajuan;
    
    if (userRole === 'ADMIN') {
      // Admin melihat SEMUA pengajuan (untuk monitoring)
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
      // Dosen hanya melihat pengajuan dari mahasiswa bimbingannya
      const dosen = await prisma.dosen.findUnique({
        where: { userId: userId! }
      });
      
      if (!dosen) {
        return res.status(404).json({ error: 'Dosen tidak ditemukan' });
      }
      
      pengajuan = await prisma.pengajuanJudul.findMany({
        where: {
          OR: [
            { dosenPembimbingId: dosen.id }, // Sudah menjadi pembimbing
            { 
              status: 'PENDING',
              // Untuk pengajuan baru yang belum ada dosen pembimbing
              // Bisa ditampilkan semua atau sesuai kebijakan
            }
          ]
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
        orderBy: { createdAt: 'desc' }
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

// ============ HANYA DOSEN ============
// Dosen menyetujui pengajuan judul
export const approvePengajuan = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ PERBAIKI: Konversi id ke string
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID pengajuan tidak valid' });
    }
    
    const { catatan } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    // VALIDASI: Hanya DOSEN yang bisa approve
    if (userRole !== 'DOSEN') {
      return res.status(403).json({ 
        error: 'Hanya dosen yang berwenang menyetujui pengajuan judul' 
      });
    }
    
    // Dapatkan data dosen
    const dosen = await prisma.dosen.findUnique({
      where: { userId: userId! }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Data dosen tidak ditemukan' });
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
    
    // VALIDASI: Apakah dosen ini yang menjadi pembimbing?
    // Jika pengajuan sudah memiliki dosenPembimbingId, cek kecocokan
    if (pengajuan.dosenPembimbingId && pengajuan.dosenPembimbingId !== dosen.id) {
      return res.status(403).json({ 
        error: 'Anda tidak berwenang menyetujui pengajuan ini (bukan mahasiswa bimbingan Anda)' 
      });
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
      message: 'Pengajuan judul berhasil disetujui',
      data: updated
    });
  } catch (error) {
    console.error('Approve pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Dosen menolak pengajuan judul
export const rejectPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ PERBAIKI: Konversi id ke string
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID pengajuan tidak valid' });
    }
    
    const { catatan } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    // VALIDASI: Hanya DOSEN yang bisa reject
    if (userRole !== 'DOSEN') {
      return res.status(403).json({ 
        error: 'Hanya dosen yang berwenang menolak pengajuan judul' 
      });
    }
    
    // Wajib ada catatan penolakan
    if (!catatan) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi' });
    }
    
    // Dapatkan data dosen
    const dosen = await prisma.dosen.findUnique({
      where: { userId: userId! }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Data dosen tidak ditemukan' });
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
    
    // VALIDASI: Apakah dosen ini yang menjadi pembimbing?
    if (pengajuan.dosenPembimbingId && pengajuan.dosenPembimbingId !== dosen.id) {
      return res.status(403).json({ 
        error: 'Anda tidak berwenang menolak pengajuan ini (bukan mahasiswa bimbingan Anda)' 
      });
    }
    
    // Reject pengajuan
    const updated = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'REJECTED',
        catatan: catatan,
        dosenPembimbingId: dosen.id, // Tetap catat siapa yang menolak
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

// ============ ADMIN ONLY ============
// Admin bisa assign ulang dosen pembimbing (jika diperlukan)
export const assignDosenPembimbing = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ PERBAIKI: Konversi id ke string
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID pengajuan tidak valid' });
    }
    
    const { dosenPembimbingId } = req.body;
    const userRole = req.user?.role;
    
    // Hanya ADMIN yang bisa assign ulang
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Hanya admin yang dapat mengassign dosen pembimbing' });
    }
    
    if (!dosenPembimbingId) {
      return res.status(400).json({ error: 'Dosen pembimbing wajib dipilih' });
    }
    
    // Cek apakah dosen ada
    const dosen = await prisma.dosen.findUnique({
      where: { id: dosenPembimbingId }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    // Cek apakah pengajuan ada
    const pengajuan = await prisma.pengajuanJudul.findUnique({
      where: { id }
    });
    
    if (!pengajuan) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }
    
    // Update dosen pembimbing
    const updated = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        dosenPembimbingId: dosenPembimbingId
      }
    });
    
    res.json({
      success: true,
      message: 'Dosen pembimbing berhasil diassign',
      data: updated
    });
  } catch (error) {
    console.error('Assign dosen error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};