import * as Minio from "minio"

const endpoint = process.env.MINIO_ENDPOINT || "localhost"
const port = parseInt(process.env.MINIO_PORT || "9000", 10)
const useSSL = process.env.MINIO_USE_SSL === "true"

const accessKey = process.env.MINIO_ACCESS_KEY
const secretKey = process.env.MINIO_SECRET_KEY

if (!accessKey || !secretKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[minio] MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set in production")
  }
  console.warn("[minio] WARNING: MINIO_ACCESS_KEY / MINIO_SECRET_KEY not set — using dev defaults")
}

export const minioClient = new Minio.Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey: accessKey ?? "minioadmin",
  secretKey: secretKey ?? "minioadmin123",
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
    console.info(`[minio] Created bucket: ${BUCKET}`)
  }
}

/**
 * Returns a direct public URL for the given object key.
 * The medusa-media bucket has a public read policy (s3:GetObject for *),
 * so no signing is required. The URL is constructed from PUBLIC_URL which
 * is set to the externally accessible MinIO address (e.g. http://localhost:9002).
 */
export function generatePresignedGetUrl(
  key: string,
  _expirySeconds = 604_800
): Promise<string> {
  return Promise.resolve(`${PUBLIC_URL}/${BUCKET}/${key}`)
}
