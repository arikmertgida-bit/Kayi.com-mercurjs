import * as Minio from "minio"

const endpoint = process.env.MINIO_ENDPOINT || "localhost"
const port = parseInt(process.env.MINIO_PORT || "9000", 10)
const useSSL = process.env.MINIO_USE_SSL === "true"

export const minioClient = new Minio.Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
})

export const BUCKET = process.env.MINIO_BUCKET || "medusa-media"
export const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || `http://${endpoint}:${port}`

/**
 * Ensure the target bucket exists. Called once on startup.
 */
export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BUCKET)
    console.log(`[minio] Created bucket: ${BUCKET}`)
  }
}

/**
 * Returns the full public URL for a stored object key.
 */
export function objectUrl(key: string): string {
  return `${PUBLIC_URL}/${BUCKET}/${key}`
}
