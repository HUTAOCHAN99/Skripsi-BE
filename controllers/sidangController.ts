import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const createJadwalSidang = async (req: Request, res: Response) => {
  try {
    const { mahasiswaId, dosenPembimbingId, dosenPengujiId, tanggal, jam, ruang } = req.body;
    
    const jadwal = await prisma.jadwalSidang.create({
      data: {
        mahasiswaId,
        dosenPembimbingId,
        dosenPengujiId,
        tanggal: new Date(tanggal),
        jam,
        ruang,
        status: 'SCHEDULED'
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Jadwal sidang berhasil dibuat',
      data: jadwal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllJadwalSidang = async (req: Request, res: Response) => {
  try {
    const jadwal = await prisma.jadwalSidang.findMany({
      include: {
        mahasiswa: true,
        dosenPembimbing: true,
        dosenPenguji: true
      },
      orderBy: { tanggal: 'asc' }
    });
    
    res.json({
      success: true,
      data: jadwal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getJadwalSidangByMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const jadwal = await prisma.jadwalSidang.findUnique({
      where: { mahasiswaId: mahasiswa.id },
      include: {
        dosenPembimbing: true,
        dosenPenguji: true
      }
    });
    
    res.json({
      success: true,
      data: jadwal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateJadwalSidang = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tanggal, jam, ruang, status } = req.body;
    
    const jadwal = await prisma.jadwalSidang.update({
      where: { id },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        jam,
        ruang,
        status
      }
    });
    
    res.json({
      success: true,
      message: 'Jadwal sidang berhasil diupdate',
      data: jadwal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelJadwalSidang = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const jadwal = await prisma.jadwalSidang.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    res.json({
      success: true,
      message: 'Jadwal sidang dibatalkan',
      data: jadwal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};