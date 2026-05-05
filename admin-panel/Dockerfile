# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prefer-frozen-lockfile

COPY . .

# Build-time arguments — VITE_* vars are statically replaced in the bundle at build time
ARG VITE_MEDUSA_BASE=/
ARG VITE_MEDUSA_BACKEND_URL=http://localhost:9000
ARG VITE_MEDUSA_STOREFRONT_URL=http://localhost:3000
ARG VITE_MESSENGER_URL=http://localhost:4000
ENV VITE_MEDUSA_BASE=$VITE_MEDUSA_BASE \
    VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL \
    VITE_MEDUSA_STOREFRONT_URL=$VITE_MEDUSA_STOREFRONT_URL \
    VITE_MESSENGER_URL=$VITE_MESSENGER_URL

# Build Vite app at image build time
RUN pnpm build:preview


# ── Stage 2: Runtime (nginx:alpine — ~30MB vs ~300MB+ node:alpine) ────────────
FROM nginx:alpine

# Copy static bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
