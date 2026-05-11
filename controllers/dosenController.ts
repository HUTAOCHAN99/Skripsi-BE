import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/bcrypt';

export const getAllDosen = async (req: Request, res: Response) => {
  try {
    const dosen = await prisma.dosen.findMany({
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: dosen
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDosenById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const dosen = await prisma.dosen.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true }
        },
        pembimbing: {
          include: { mahasiswa: true }
        }
      }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    res.json({
      success: true,
      data: dosen
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDosen = async (req: Request, res: Response) => {
  try {
    const { email, password, nama, nip, bidangKeahlian, kuota } = req.body;
    
    // ✅ FIX: Hash password before saving
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // Use hashed password
        role: 'DOSEN'
      }
    });
    
    const dosen = await prisma.dosen.create({
      data: {
        userId: user.id,
        nama,
        nip,
        bidangKeahlian,
        kuota: kuota || 5
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Dosen berhasil ditambahkan',
      data: dosen
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDosen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nama, bidangKeahlian, kuota, noTelp } = req.body;
    
    const dosen = await prisma.dosen.update({
      where: { id },
      data: {
        nama,
        bidangKeahlian,
        kuota,
        noTelp
      }
    });
    
    res.json({
      success: true,
      message: 'Data dosen berhasil diupdate',
      data: dosen
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDosen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const dosen = await prisma.dosen.findUnique({ where: { id } });
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    await prisma.user.delete({ where: { id: dosen.userId } });
    
    res.json({
      success: true,
      message: 'Dosen berhasil dihapus'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};