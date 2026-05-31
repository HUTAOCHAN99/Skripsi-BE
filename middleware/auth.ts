import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

type UserRole = 'ADMIN' | 'DOSEN' | 'MAHASISWA';

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: No token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: 'Unauthorized: Invalid token',
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
      });
    }

    next();
  };
};