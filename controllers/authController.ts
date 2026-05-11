import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, nama, nim, angkatan, nip, bidangKeahlian } = req.body;
    
    // Cek user sudah ada
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Buat user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    });
    
    // Buat profile sesuai role
    if (role === 'MAHASISWA') {
      await prisma.mahasiswa.create({
        data: {
          userId: user.id,
          nama,
          nim,
          angkatan: parseInt(angkatan)
        }
      });
    } else if (role === 'DOSEN') {
      await prisma.dosen.create({
        data: {
          userId: user.id,
          nama,
          nip,
          bidangKeahlian: bidangKeahlian
        }
      });
    }
    
    const token = generateToken(user.id, user.role);
    
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: { token, user: { id: user.id, email: user.email, role: user.role } }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    const token = generateToken(user.id, user.role);
    
    let profile = null;
    if (user.role === 'MAHASISWA') {
      profile = await prisma.mahasiswa.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'DOSEN') {
      profile = await prisma.dosen.findUnique({ where: { userId: user.id } });
    }
    
    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    let profile = null;
    if (user.role === 'MAHASISWA') {
      profile = await prisma.mahasiswa.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'DOSEN') {
      profile = await prisma.dosen.findUnique({ where: { userId: user.id } });
    }
    
    res.json({
      success: true,
      data: { user, profile }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};