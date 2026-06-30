# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_collections"
ENV DATABASE_URL=$DATABASE_URL

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

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
