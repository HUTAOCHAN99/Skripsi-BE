import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const createLogBimbingan = async (req: AuthRequest, res: Response) => {
  try {
    const { mahasiswaId, topik, catatan, tanggal } = req.body;
    const userId = req.user?.userId;
    
    const dosen = await prisma.dosen.findUnique({
      where: { userId: userId! }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    const count = await prisma.logBimbingan.count({
      where: { mahasiswaId }
    });
    
    const log = await prisma.logBimbingan.create({
      data: {
        mahasiswaId,
        dosenId: dosen.id,
        pertemuanKe: count + 1,
        tanggal: new Date(tanggal),
        topik,
        catatan,
        status: 'PENDING'
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Log bimbingan berhasil ditambahkan',
      data: log
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLogBimbinganByMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const logs = await prisma.logBimbingan.findMany({
      where: { mahasiswaId: mahasiswa.id },
      include: { dosen: true },
      orderBy: { tanggal: 'desc' }
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllLogBimbingan = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.logBimbingan.findMany({
      include: {
        mahasiswa: true,
        dosen: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveLogBimbingan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logId = Array.isArray(id) ? id[0] : id;
    
    const log = await prisma.logBimbingan.update({
      where: { id: logId },
      data: { status: 'APPROVED' }
    });
    
    res.json({
      success: true,
      message: 'Log bimbingan disetujui',
      data: log
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectLogBimbingan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logId = Array.isArray(id) ? id[0] : id;
    
    const log = await prisma.logBimbingan.update({
      where: { id: logId },
      data: { status: 'REJECTED' }
    });
    
    res.json({
      success: true,
      message: 'Log bimbingan ditolak',
      data: log
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};