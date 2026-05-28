FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL dan dependencies untuk Prisma
RUN apk add --no-cache openssl openssl-dev

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client dengan binaryTargets yang sudah diupdate
RUN npx prisma generate

COPY . .

RUN npm run build

# ============ PRODUCTION STAGE ============
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL juga di runtime (penting!)
RUN apk add --no-cache openssl openssl-dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=8080

# Pastikan Cloud SQL Proxy socket directory ada
RUN mkdir -p /cloudsql

EXPOSE 8080

CMD ["sh", "-c", "node dist/server.js 2>&1"]