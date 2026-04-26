FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install

COPY . .

# Build-time arguments — VITE_* vars are statically replaced in the bundle at build time
ARG VITE_MEDUSA_BASE=/
ARG VITE_MEDUSA_BACKEND_URL=http://localhost:9000
ARG VITE_MEDUSA_STOREFRONT_URL=http://localhost:3000
ARG VITE_MEDUSA_PUBLISHABLE_KEY
ARG VITE_DISABLE_SELLERS_REGISTRATION=false
ENV VITE_MEDUSA_BASE=$VITE_MEDUSA_BASE \
    VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL \
    VITE_MEDUSA_STOREFRONT_URL=$VITE_MEDUSA_STOREFRONT_URL \
    VITE_MEDUSA_PUBLISHABLE_KEY=$VITE_MEDUSA_PUBLISHABLE_KEY \
    VITE_DISABLE_SELLERS_REGISTRATION=$VITE_DISABLE_SELLERS_REGISTRATION

# Build Vite app at image build time (API key is pre-set via build arg)
RUN pnpm build:preview

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 7001

CMD ["sh", "-c", "pnpm preview --host --port ${PORT:-7001}"]
