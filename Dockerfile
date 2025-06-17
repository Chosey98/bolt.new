# Use Node.js 20 as base image
FROM node:20-alpine AS base

# Install pnpm globally and required packages for Prisma
RUN npm install -g pnpm@9.4.0 && \
    apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

# Install pnpm globally, wget for health checks, OpenSSL for Prisma, and PostgreSQL client
RUN npm install -g pnpm@9.4.0 && \
    apk add --no-cache wget openssl postgresql-client

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bolt -u 1001 -G nodejs

# Set working directory and change ownership
WORKDIR /app
RUN chown bolt:nodejs /app

# Copy package files and install dependencies as the correct user
COPY --chown=bolt:nodejs package.json ./
RUN pnpm install --no-frozen-lockfile --prod && \
    pnpm add vite-plugin-node-polyfills

# Copy built application and necessary files with correct ownership
COPY --chown=bolt:nodejs --from=base /app/build ./build
COPY --chown=bolt:nodejs --from=base /app/public ./public
COPY --chown=bolt:nodejs --from=base /app/app ./app

# Copy Prisma files and generated client with correct ownership
COPY --chown=bolt:nodejs --from=base /app/prisma ./prisma
COPY --chown=bolt:nodejs --from=base /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/

# Copy configuration files with correct ownership
COPY --chown=bolt:nodejs vite.config.ts tsconfig.json uno.config.ts ./
COPY --chown=bolt:nodejs load-context.ts worker-configuration.d.ts ./

# Copy startup script with correct ownership
COPY --chown=bolt:nodejs start.sh ./
RUN chmod +x start.sh

USER bolt

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["./start.sh"]
