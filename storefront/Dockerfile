# Builder stage
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
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_DESCRIPTION=$NEXT_PUBLIC_SITE_DESCRIPTION \
    NEXT_PUBLIC_VENDOR_URL=$NEXT_PUBLIC_VENDOR_URL \
    NEXT_PUBLIC_MESSENGER_URL=$NEXT_PUBLIC_MESSENGER_URL \
    NEXT_PUBLIC_MEILISEARCH_HOST=$NEXT_PUBLIC_MEILISEARCH_HOST \
    NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=$NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY \
    NEXT_PUBLIC_SEARCH_API_KEY=$NEXT_PUBLIC_SEARCH_API_KEY \
    NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED

# Build Next.js app at image build time (not at container start)
RUN NODE_OPTIONS=--openssl-legacy-provider NEXT_TELEMETRY_DISABLED=1 pnpm next build

# Production stage
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy only production dependencies and .npmrc from builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm install --prod --prefer-frozen-lockfile

# Copy built .next directory from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "pnpm run launcher start"]
