// config/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

prisma.$connect()
  .then(() => console.log('✅ Database connected'))
  .catch((err: Error) => console.error('❌ Database connection failed:', err));

export default prisma;