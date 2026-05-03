import { Client } from "minio"

let _client: Client | null = null

/**
 * Returns a MinIO client built from environment variables.
 * Singleton — reused across requests.
 */
export function getMinioClient(): Client {
  if (_client) return _client
  _client = new Client({
    endPoint:  process.env.MINIO_ENDPOINT  ?? "minio",
    port:      parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL:    process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin123",
  })
  return _client
}

export const IMPORT_BUCKET = process.env.MINIO_BUCKET ?? "medusa-media"

/** Ensure the import temp/errors prefix paths exist (MinIO doesn't need explicit folder creation) */
export async function ensureImportBucket(): Promise<void> {
  const client = getMinioClient()
  const exists = await client.bucketExists(IMPORT_BUCKET)
  if (!exists) {
    await client.makeBucket(IMPORT_BUCKET)
  }
}

/**
 * Upload a Buffer to MinIO and return the object path.
 */
export async function putObject(
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await ensureImportBucket()
  const client = getMinioClient()
  await client.putObject(IMPORT_BUCKET, objectPath, buffer, buffer.length, {
    "Content-Type": contentType,
  })
  return objectPath
}

/**
 * Download an object from MinIO and return as Buffer.
 */
export async function getObject(objectPath: string): Promise<Buffer> {
  const client = getMinioClient()
  const stream = await client.getObject(IMPORT_BUCKET, objectPath)
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

/**
 * Delete an object from MinIO (cleanup after job completes).
 */
export async function removeObject(objectPath: string): Promise<void> {
  try {
    const client = getMinioClient()
    await client.removeObject(IMPORT_BUCKET, objectPath)
  } catch {
    // Best-effort cleanup — do not throw
  }
}

/**
 * Generate a short-lived presigned GET URL for a private object (error log CSV).
 * Replaces the internal Docker hostname with the public-facing URL from MINIO_PUBLIC_URL.
 * Expires in 1 hour (3600 seconds).
 */
export async function presignedGetUrl(objectPath: string, expirySeconds = 3600): Promise<string> {
  const client = getMinioClient()
  const url = await client.presignedGetObject(IMPORT_BUCKET, objectPath, expirySeconds)

  // Replace internal Docker hostname (e.g. http://minio:9000) with public URL
  const publicUrl = process.env.MINIO_PUBLIC_URL
  if (publicUrl) {
    const internalBase = `http://${process.env.MINIO_ENDPOINT ?? "minio"}:${process.env.MINIO_PORT ?? "9000"}`
    return url.replace(internalBase, publicUrl.replace(/\/$/, ""))
  }
  return url
}
