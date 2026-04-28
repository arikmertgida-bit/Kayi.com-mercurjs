# Builder stage

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate && pnpm --version

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prefer-frozen-lockfile

COPY . .

# Build-time arguments — VITE_* vars are statically replaced in the bundle at build time
ARG VITE_MEDUSA_BASE=/
ARG VITE_MEDUSA_BACKEND_URL=http://localhost:9000
ARG VITE_MEDUSA_STOREFRONT_URL=http://localhost:3000
ENV VITE_MEDUSA_BASE=$VITE_MEDUSA_BASE \
    VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL \
    VITE_MEDUSA_STOREFRONT_URL=$VITE_MEDUSA_STOREFRONT_URL

# Build Vite app at image build time
RUN pnpm build:preview

# Production stage

FROM node:22-alpine
RUN npm install -g pnpm@10.33.0

WORKDIR /app

# Copy only production dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prefer-frozen-lockfile

# Copy built dist directory from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 5173

CMD ["sh", "-c", "pnpm preview --host --port 5173"]
