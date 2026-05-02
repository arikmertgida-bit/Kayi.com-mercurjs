# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Install ALL dependencies (dev + prod required for medusa build)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prefer-frozen-lockfile

COPY . .

# Compile Medusa app → produces .medusa/server/ with its own package.json
RUN pnpm build

# Install ONLY production dependencies inside the compiled output
# .medusa/server has its own package.json — no lockfile so we use npm
# --legacy-peer-deps: @medusajs/ui version conflict between mercurjs and draft-order is non-breaking
WORKDIR /app/.medusa/server
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund --legacy-peer-deps


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy ONLY the self-contained compiled server (includes its own node_modules)
# No root node_modules, no source files, no dev tools
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/.medusa/server ./

USER appuser

EXPOSE 9000

# Run from /app (was .medusa/server in builder, same content)
CMD ["sh", "-c", "npx medusa db:migrate && (node src/scripts/ensure-columns.js || echo 'ensure-columns skipped') && node src/scripts/init-meilisearch.js && node src/scripts/create-search-key.js && npx medusa start"]
