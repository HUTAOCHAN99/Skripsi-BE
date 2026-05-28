FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl untuk Prisma (Alpine butuh ini)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client untuk Alpine (linux-musl)
RUN npx prisma generate

COPY . .

RUN npm run build

# ============ PRODUCTION STAGE ============
FROM node:20-alpine

WORKDIR /app

# Install openssl juga di runtime
RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.js"]