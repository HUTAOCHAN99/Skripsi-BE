import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/bcrypt';

// Helper function untuk mendapatkan ID dari params
const getParamId = (id: string | string[] | undefined): string | null => {
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
};

// ============ GET ALL MAHASISWA ============
export const getAllMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const mahasiswa = await prisma.mahasiswa.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { angkatan: 'desc' }
    });
    
    res.json({
      success: true,
      data: mahasiswa
    });
  } catch (error) {
    console.error('Get all mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ GET MAHASISWA BY ID ============
export const getMahasiswaById = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ PERBAIKI: Konversi id ke string
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID mahasiswa tidak valid' });
    }
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    res.json({
      success: true,
      data: mahasiswa
    });
  } catch (error) {
    console.error('Get mahasiswa by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ CREATE MAHASISWA ============
export const createMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, nama, nim, angkatan, noTelp, alamat } = req.body;
    
    // Validasi required fields
    if (!email || !password || !nama || !nim || !angkatan) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }
    
    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Cek apakah NIM sudah terdaftar
    const existingMahasiswa = await prisma.mahasiswa.findUnique({
      where: { nim }
    });
    
    if (existingMahasiswa) {
      return res.status(400).json({ error: 'NIM sudah terdaftar' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user and mahasiswa in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'MAHASISWA'
        }
      });
      
      const mahasiswa = await tx.mahasiswa.create({
        data: {
          userId: user.id,
          nama,
          nim,
          angkatan: parseInt(angkatan),
          noTelp: noTelp || null,
          alamat: alamat || null
        }
      });
      
      return { user, mahasiswa };
    });
    
    res.status(201).json({
      success: true,
      message: 'Mahasiswa berhasil ditambahkan',
      data: result.mahasiswa
    });
  } catch (error) {
    console.error('Create mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ UPDATE MAHASISWA ============
export const updateMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ PERBAIKI: Konversi id ke string
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID mahasiswa tidak valid' });
    }
    
    const { nama, noTelp, alamat } = req.body;
    
    // Cek apakah mahasiswa ada
    const existingMahasiswa = await prisma.mahasiswa.findUnique({
      where: { id }
    });
    
    if (!existingMahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const mahasiswa = await prisma.mahasiswa.update({
      where: { id },
      data: {
        nama: nama || undefined,
        noTelp: noTelp || null,
        alamat: alamat || null
      }
    });
    
    res.json({
      success: true,
      message: 'Data mahasiswa berhasil diupdate',
      data: mahasiswa
    });
  } catch (error) {
    console.error('Update mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ DELETE MAHASISWA ============
export const deleteMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ PERBAIKI: Konversi id ke string
    const rawId = req.params.id;
    const id = getParamId(rawId);
    
    if (!id) {
      return res.status(400).json({ error: 'ID mahasiswa tidak valid' });
    }
    
    // Cek apakah mahasiswa ada
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id }
    });
    
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    // Delete user (cascade will delete mahasiswa)
    await prisma.user.delete({
      where: { id: mahasiswa.userId }
    });
    
    res.json({
      success: true,
      message: 'Mahasiswa berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};