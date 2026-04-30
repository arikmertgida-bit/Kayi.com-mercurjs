import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import sharp from "sharp"
import { putObject, getMinioClient, IMPORT_BUCKET } from "../lib/minio-client.js"

const MAX_DIMENSION = 1200

/**
 * Downloads an image from a URL and resizes it to max 1200×1200 WebP.
 * Returns the MinIO path of the optimized image.
 */
async function optimizeImageFromUrl(url: string, objectPath: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const input = Buffer.from(arrayBuffer)

  const optimized = await sharp(input)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  await putObject(objectPath, optimized, "image/webp")
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://")
}

export default async function importImageOptimizerSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileModule = container.resolve(Modules.FILE)

  try {
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: ["id", "thumbnail", "*images"],
      filters: { id: data.id },
    })

    if (!product) return

    // Only optimize products that came from an import (external URLs)
    const thumbnailUrl: string | undefined = product.thumbnail
    const imageUrls: string[] = (product.images ?? []).map((i: any) => i.url)

    const allExternal = [thumbnailUrl, ...imageUrls].filter(
      (url): url is string => !!url && isExternalUrl(url)
    )

    if (allExternal.length === 0) return

    const optimizedUrls: Map<string, string> = new Map()

    for (const url of allExternal) {
      try {
        const fileName = `products/${product.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
        await optimizeImageFromUrl(url, fileName)
        // Build public URL via MinIO endpoint
        const client = getMinioClient()
        const endPoint = process.env.MINIO_ENDPOINT ?? "minio"
        const port = process.env.MINIO_PORT ?? "9000"
        const useSSL = process.env.MINIO_USE_SSL === "true"
        const proto = useSSL ? "https" : "http"
        const publicUrl = `${proto}://${endPoint}:${port}/${IMPORT_BUCKET}/${fileName}`
        optimizedUrls.set(url, publicUrl)
      } catch {
        // Non-fatal: keep original URL if optimization fails
      }
    }

    if (optimizedUrls.size === 0) return

    // Update product thumbnail and images with optimized URLs
    const productService = container.resolve(Modules.PRODUCT)
    const updatePayload: any = {}

    if (thumbnailUrl && optimizedUrls.has(thumbnailUrl)) {
      updatePayload.thumbnail = optimizedUrls.get(thumbnailUrl)
    }

    const newImages = imageUrls.map((url) => ({
      url: optimizedUrls.get(url) ?? url,
    }))

    if (newImages.length > 0) {
      updatePayload.images = newImages
    }

    if (Object.keys(updatePayload).length > 0) {
      await productService.updateProducts(product.id, updatePayload)
    }
  } catch (err: any) {
    // Subscriber errors must not crash the server — log and continue
    console.error(
      `[import-image-optimizer] Failed to optimize images for product ${data.id}:`,
      err?.message ?? err
    )
  }
}

export const config: SubscriberConfig = {
  event: ["product.created"],
}
