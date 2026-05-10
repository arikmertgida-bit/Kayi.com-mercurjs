/**
 * Uploads the default seller avatar SVG to MinIO if it does not already exist.
 * Runs once at container startup — idempotent (skips if the object is already present).
 * Failures are non-fatal: startup continues regardless of outcome.
 */
import { Client } from "minio"

const OBJECT_KEY = "defaults/seller-default-avatar.svg"

const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <circle cx="50" cy="50" r="50" fill="#E5E7EB"/>
  <circle cx="50" cy="38" r="16" fill="#9CA3AF"/>
  <path d="M14 85c0-19.882 16.118-36 36-36s36 16.118 36 36" fill="#9CA3AF"/>
</svg>`

async function main(): Promise<void> {
  const endpoint = process.env.MINIO_ENDPOINT
  const portStr  = process.env.MINIO_PORT
  const useSSL   = process.env.MINIO_USE_SSL === "true"
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucket   = process.env.MINIO_BUCKET ?? "medusa-media"

  if (!endpoint || !accessKey || !secretKey) {
    console.log("ensure-default-assets: MinIO env vars not set — skipping.")
    return
  }

  const port = portStr ? parseInt(portStr, 10) : (useSSL ? 443 : 80)

  const client = new Client({
    endPoint: endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  })

  // Ensure bucket exists (might not on a completely fresh install)
  const bucketExists = await client.bucketExists(bucket)
  if (!bucketExists) {
    await client.makeBucket(bucket)
    console.log(`ensure-default-assets: created bucket '${bucket}'.`)
  }

  // Check if the default asset already exists — skip if so
  try {
    await client.statObject(bucket, OBJECT_KEY)
    console.log(`ensure-default-assets: '${OBJECT_KEY}' already present — skipping.`)
    return
  } catch {
    // Object does not exist — proceed with upload
  }

  const content = Buffer.from(SVG_CONTENT, "utf-8")
  await client.putObject(bucket, OBJECT_KEY, content, content.length, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=31536000, immutable",
  })

  console.log(`ensure-default-assets: uploaded '${OBJECT_KEY}' to bucket '${bucket}'.`)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`ensure-default-assets: error — ${message} (startup continues)`)
  process.exit(0) // non-fatal
})
