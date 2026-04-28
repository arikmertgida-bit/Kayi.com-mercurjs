FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --prefer-frozen-lockfile

COPY . .

# Build Medusa application at image build time (not at container start)
RUN pnpm build

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && npx tsx src/scripts/ensure-columns.ts && pnpm start"]
