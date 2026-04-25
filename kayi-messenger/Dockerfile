FROM node:20-slim

# Required for Prisma on Debian slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
