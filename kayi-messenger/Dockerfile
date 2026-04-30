# ── Stage 1: Build ───────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Install ALL dependencies (dev deps required for tsc + prisma generate)
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

# Generate Prisma client (requires schema before compile)
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript source to dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# ── Stage 2: Runtime ────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# openssl required by Prisma binary engine on Alpine.
# Create non-root user AND pre-create /app with correct ownership in one layer.
# IMPORTANT: /app must be owned by appuser BEFORE `USER appuser` + `npm ci` run,
# otherwise npm cannot create node_modules (EACCES on root-owned WORKDIR).
RUN apk add --no-cache openssl \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && mkdir -p /app \
    && chown appuser:appgroup /app

WORKDIR /app

# Copy only the manifest files needed for a clean production install.
# --chown: files already owned by appuser, no subsequent `chown -R` needed
# (chown -R after large node_modules install duplicates all files into a new
# layer, which bloated the previous image by ~140MB)
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/package-lock.json ./

# Copy Prisma schema (needed for migrate deploy at container start)
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

# Switch to non-root user before npm so installed files are already owned correctly.
USER appuser

# Single RUN layer:
# 1. Install prod deps (no devDeps: typescript, tsx, @types/* are excluded)
# 2. Generate Prisma client against the production node_modules
# 3. Delete debian Prisma engine binary — `prisma` npm package ships BOTH linux-musl
#    AND debian binaries; on Alpine only linux-musl is needed (~20MB saving)
# 4. Delete any other non-musl engine binaries from .prisma and @prisma/engines
# 5. Clean npm cache
# NOTE: `find -delete` returns 0 even when no files match (POSIX behaviour) so
# no `|| true` guards are needed — they would swallow real errors from npm ci.
RUN npm ci --omit=dev --no-audit --no-fund \
    && npx prisma generate \
    && find /app/node_modules/prisma -name "libquery_engine-*" ! -name "*linux-musl*" -delete 2>/dev/null \
    && find /app/node_modules/.prisma -name "*.node" ! -name "*linux-musl*" -delete 2>/dev/null \
    && find /app/node_modules/@prisma/engines -maxdepth 1 -type f \( -name "*.node" -o -name "schema-engine-*" \) ! -name "*linux-musl*" -delete 2>/dev/null \
    && npm cache clean --force

# Copy compiled JavaScript output from builder — no TypeScript source files
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/index.js"]
