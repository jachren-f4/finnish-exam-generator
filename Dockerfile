# Multi-stage Docker build for Next.js 15 production deployment
# Optimized for security, performance, and minimal image size

# ==============================================================================
# Stage 1: Base Dependencies
# ==============================================================================
FROM node:22-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# ==============================================================================
# Stage 2: Dependencies Installation
# ==============================================================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production --frozen-lockfile

# ==============================================================================
# Stage 3: Build Stage
# ==============================================================================
FROM base AS builder

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Set build-time environment variables
ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1

ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED

# Build the application
RUN npm run build

# ==============================================================================
# Stage 4: Runtime Stage
# ==============================================================================
FROM base AS runtime

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set application configuration
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]

# ==============================================================================
# Labels for metadata
# ==============================================================================
LABEL maintainer="gemini-ocr-team"
LABEL version="1.0.0"
LABEL description="Gemini OCR API - Production container"
LABEL org.opencontainers.image.source="https://github.com/your-org/gemini-ocr"