# ── Stage 1: Build ───────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Install ALL dependencies (dev deps required for tsc + prisma generate)
COPY package.json package-lock.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies in-place (leaves only production deps)
RUN npm prune --omit=dev


# ── Stage 2: Runtime ────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# openssl required by Prisma binary engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy pruned production node_modules (no TypeScript compiler, no tsx)
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (needed by migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Copy package.json (required by some runtime Node.js resolution paths)
COPY --from=builder /app/package.json ./

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

# Prisma CLI is included in production deps (moved from devDependencies)
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/index.js"]
