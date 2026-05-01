import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import sharp from "sharp"

type ImageType = "avatar" | "cover"

const IMAGE_CONFIGS: Record<ImageType, { width: number; height: number }> = {
  cover:  { width: 1920, height: 400 },
  avatar: { width: 400,  height: 400 },
}

interface ProcessResult {
  buffer: Buffer
  ext: string
  mimeType: string
}

async function processImage(
  buffer: Buffer,
  originalName: string,
  originalMime: string,
  imageType: ImageType,
): Promise<ProcessResult> {
  const { width, height } = IMAGE_CONFIGS[imageType]
  const meta = await sharp(buffer).metadata()
  const srcW = meta.width ?? 0
  const srcH = meta.height ?? 0

  // If already the correct dimensions, preserve the original file to avoid any quality loss.
  // This is the same behaviour as the seller header (which stores originals directly).
  if (srcW === width && srcH === height) {
    const ext = originalName.split(".").pop() || "jpg"
    return { buffer, ext, mimeType: originalMime }
  }

  // Resize + center-crop to exact target dimensions
  const scale = Math.max(width / srcW, height / srcH)
  const scaledW = Math.ceil(srcW * scale)
  const scaledH = Math.ceil(srcH * scale)
  const left = Math.max(0, Math.floor((scaledW - width) / 2))
  const top  = Math.max(0, Math.floor((scaledH - height) / 2))

  const processed = await sharp(buffer)
    .resize(scaledW, scaledH, { kernel: "lanczos3" })
    .extract({ left, top, width, height })
    .webp({ quality: 95 })
    .toBuffer()

  return { buffer: processed, ext: "webp", mimeType: "image/webp" }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const files = (req as any).files as any[]
  if (!files || files.length === 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  }

  const rawImageType = req.headers["x-image-type"]
  const imageType: ImageType | null =
    rawImageType === "avatar" || rawImageType === "cover" ? rawImageType : null

  const fileService = req.scope.resolve(Modules.FILE)

  const processedFiles = await Promise.all(
    files.map(async (f: any) => {
      if (imageType && Buffer.isBuffer(f.buffer)) {
        try {
          const result = await processImage(
            f.buffer as Buffer,
            f.originalname as string,
            f.mimetype as string,
            imageType,
          )
          const baseName = (f.originalname as string).replace(/\.[^.]+$/, "")
          return {
            filename: `${baseName}.${result.ext}`,
            mimeType: result.mimeType,
            content: result.buffer.toString("base64"),
            access: "public" as const,
          }
        } catch (err) {
          // sharp başarısız olursa orijinale düşer (non-fatal)
          console.error("[customer/upload] sharp processing failed, using original:", err)
        }
      }
      return {
        filename: f.originalname as string,
        mimeType: f.mimetype as string,
        content: (f.buffer as Buffer).toString("base64"),
        access: "public" as const,
      }
    })
  )

  const result = await fileService.createFiles(processedFiles)

  res.json({ files: result })
}
