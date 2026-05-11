import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const createPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const { judul, abstrak } = req.body;
    const userId = req.user?.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const pengajuan = await prisma.pengajuanJudul.create({
      data: {
        mahasiswaId: mahasiswa.id,
        judul,
        abstrak
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Pengajuan judul berhasil',
      data: pengajuan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
        dosenPembimbing: true
      }
    });
    
    res.json({
      success: true,
      data: pengajuan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllPengajuan = async (req: Request, res: Response) => {
  try {
    const pengajuan = await prisma.pengajuanJudul.findMany({
      include: {
        mahasiswa: true,
        dosenPembimbing: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: pengajuan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approvePengajuan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dosenPembimbingId, catatan } = req.body;
    const pengajuanId = Array.isArray(id) ? id[0] : id;
    
    const pengajuan = await prisma.pengajuanJudul.update({
      where: { id: pengajuanId },
      data: {
        status: 'APPROVED',
        dosenPembimbingId,
        catatan,
        tglApproved: new Date()
      }
    });
    
    if (dosenPembimbingId) {
      await prisma.dosen.update({
        where: { id: dosenPembimbingId },
        data: { terisi: { increment: 1 } }
      });
    }
    
    res.json({
      success: true,
      message: 'Pengajuan disetujui',
      data: pengajuan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectPengajuan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { catatan } = req.body;
    const pengajuanId = Array.isArray(id) ? id[0] : id;
    
    const pengajuan = await prisma.pengajuanJudul.update({
      where: { id: pengajuanId },
      data: {
        status: 'REJECTED',
        catatan
      }
    });
    
    res.json({
      success: true,
      message: 'Pengajuan ditolak',
      data: pengajuan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};