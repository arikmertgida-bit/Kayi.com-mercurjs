import { logger } from "@/lib/logger"

export default function medusaError(error: unknown): never {
  if (error !== null && typeof error === 'object' && 'response' in error) {
    const e = error as { response: { data: { message?: string }; status: number; headers: unknown }; config: { url: string; baseURL: string } }
    const u = new URL(e.config.url, e.config.baseURL)
    logger.error("Resource:", u.toString())
    logger.error("Response data:", JSON.stringify(e.response.data))
    logger.error("Status code:", String(e.response.status))
    logger.error("Headers:", JSON.stringify(e.response.headers))
    const message = e.response.data.message ?? String(e.response.data)
    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (error !== null && typeof error === 'object' && 'request' in error) {
    throw new Error("No response received: " + String((error as { request: unknown }).request))
  } else {
    throw new Error("Error setting up the request: " + (error instanceof Error ? error.message : String(error)))
  }
}
