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
ENV VITE_MEDUSA_BASE=$VITE_MEDUSA_BASE \
    VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL \
    VITE_MEDUSA_STOREFRONT_URL=$VITE_MEDUSA_STOREFRONT_URL

# Build Vite app at image build time (not at container start)
RUN pnpm build:preview

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 5173

CMD ["sh", "-c", "pnpm preview --host --port 5173"]
