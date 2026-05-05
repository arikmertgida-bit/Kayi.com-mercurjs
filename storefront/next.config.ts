import type { NextConfig } from "next"
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  // Expose MEDUSA_BACKEND_URL to Edge middleware via build-time env injection
  // Edge Runtime cannot read runtime env vars; they must be in next.config env block
  env: {
    MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000',
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: false,
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "mercur-connect.s3.eu-central-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "api.mercurjs.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9002",
      },
      {
        protocol: "https",
        hostname: "api-sandbox.mercurjs.com",
        pathname: "/static/**",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "s3.eu-central-1.amazonaws.com",
      },
      ...(process.env.NEXT_PUBLIC_MINIO_ENDPOINT ? [{
        protocol: "https" as const,
        hostname: process.env.NEXT_PUBLIC_MINIO_ENDPOINT,
      }] : []),
    ],
  },
}

module.exports = withNextIntl(nextConfig)
