FROM node:20-alpine

WORKDIR /app

# Install openssl (dibutuhkan Prisma) dan dumb-init
RUN apk add --no-cache openssl dumb-init

# Salin file package dan install dependencies
COPY package*.json ./
RUN npm install --production

# Salin skema Prisma dan generate client
COPY prisma ./prisma
RUN npx prisma generate

# Salin kode aplikasi
COPY server.js .

# Buat user non-root untuk keamanan
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080
ENV PORT=8080

# Gunakan entry point untuk migrasi sebelum start
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]