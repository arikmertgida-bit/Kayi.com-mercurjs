FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install

COPY . .

EXPOSE 7001

CMD ["node", "./scripts/launch-vendor.js"]
