import inject from "@medusajs/admin-vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import inspect from "vite-plugin-inspect"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const BASE = env.VITE_MEDUSA_BASE || process.env.VITE_MEDUSA_BASE || "/"
  const BACKEND_URL = env.VITE_MEDUSA_BACKEND_URL || process.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const STOREFRONT_URL =
    env.VITE_MEDUSA_STOREFRONT_URL || process.env.VITE_MEDUSA_STOREFRONT_URL || "http://localhost:8000"
  const PUBLISHABLE_API_KEY =
    env.VITE_PUBLISHABLE_API_KEY ||
    process.env.VITE_PUBLISHABLE_API_KEY ||
    env.VITE_MEDUSA_PUBLISHABLE_KEY ||
    process.env.VITE_MEDUSA_PUBLISHABLE_KEY ||
    ""
  const TALK_JS_APP_ID = env.VITE_TALK_JS_APP_ID || ""
  const DISABLE_SELLERS_REGISTRATION =
    env.VITE_DISABLE_SELLERS_REGISTRATION || "false"
  const PUBLIC_BASE_URL = env.VITE_PUBLIC_BASE_URL || ""

  const MEDUSA_PROJECT = env.VITE_MEDUSA_PROJECT || null
  const sources = MEDUSA_PROJECT ? [MEDUSA_PROJECT] : []

  const isDev = mode === "development"

  return {
    plugins: [
      // vite-plugin-inspect is a dev-only diagnostic tool — exclude from production builds
      ...(isDev ? [inspect()] : []),
      react(),
      inject({ sources }),
    ],
    define: {
      __BASE__: JSON.stringify(BASE),
      __BACKEND_URL__: JSON.stringify(BACKEND_URL),
      __STOREFRONT_URL__: JSON.stringify(STOREFRONT_URL),
      __PUBLISHABLE_API_KEY__: JSON.stringify(PUBLISHABLE_API_KEY),
      __TALK_JS_APP_ID__: JSON.stringify(TALK_JS_APP_ID),
      __DISABLE_SELLERS_REGISTRATION__: JSON.stringify(DISABLE_SELLERS_REGISTRATION),
    },
    server: {
      host: true,
      port: parseInt(process.env.PORT || '5173'),
      open: false,
      allowedHosts: PUBLIC_BASE_URL
        ? [PUBLIC_BASE_URL.replace('https://', '').replace('http://', '').split('/')[0]]
        : [],
    },
    preview: {
      host: true,
      port: parseInt(process.env.PORT || '7001'),
    },
    optimizeDeps: {
      entries: [],
      include: ["recharts"],
    },
    build: {
      // @medusajs/ui, @radix-ui, recharts/d3 have circular inter-dependencies.
      // manualChunks breaks their initialization order and causes a TDZ crash (white screen).
      // Rollup's default chunking handles all of this safely.
      // The limit is raised to silence the cosmetic size warning — it does not affect runtime.
      chunkSizeWarningLimit: 1400,
    },
  }
})
