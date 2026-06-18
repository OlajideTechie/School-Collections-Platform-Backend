# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files and prisma schema first for better caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npm run prisma:generate

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY docker-entrypoint.sh .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]