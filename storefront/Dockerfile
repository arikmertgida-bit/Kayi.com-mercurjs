# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm install --prefer-frozen-lockfile

COPY . .

# Build-time arguments — NEXT_PUBLIC_* vars are baked into the JS bundle at build time
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_DEFAULT_REGION=tr
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_DESCRIPTION
ARG NEXT_PUBLIC_VENDOR_URL=http://localhost:7001
ARG NEXT_PUBLIC_MESSENGER_URL=http://localhost:4000
ARG NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
ARG NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY
ARG NEXT_PUBLIC_SEARCH_API_KEY
ARG NEXT_PUBLIC_MINIO_ENDPOINT
# MEDUSA_BACKEND_URL must be baked in for Edge Runtime middleware (process.env unavailable in Edge)
ARG MEDUSA_BACKEND_URL=http://backend:9000
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_DESCRIPTION=$NEXT_PUBLIC_SITE_DESCRIPTION \
    NEXT_PUBLIC_VENDOR_URL=$NEXT_PUBLIC_VENDOR_URL \
    NEXT_PUBLIC_MESSENGER_URL=$NEXT_PUBLIC_MESSENGER_URL \
    NEXT_PUBLIC_MEILISEARCH_HOST=$NEXT_PUBLIC_MEILISEARCH_HOST \
    NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=$NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY \
    NEXT_PUBLIC_SEARCH_API_KEY=$NEXT_PUBLIC_SEARCH_API_KEY \
    NEXT_PUBLIC_MINIO_ENDPOINT=$NEXT_PUBLIC_MINIO_ENDPOINT \
    NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED \
    MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL

# output: 'standalone' bundles the minimal server + required node_modules into .next/standalone
RUN NEXT_TELEMETRY_DISABLED=1 pnpm next build


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Standalone output ships its own node_modules subset — no full install needed
FROM node:22-alpine

WORKDIR /app

# Copy standalone server bundle (includes its own trimmed node_modules)
COPY --from=builder /app/.next/standalone ./
# Static assets must be served from the correct path
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

ENV PORT=8000 \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production

CMD ["node", "server.js"]
