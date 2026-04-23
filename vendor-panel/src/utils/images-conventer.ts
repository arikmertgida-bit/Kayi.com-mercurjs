import { backendUrl } from "../lib/client"

export default function imagesConverter(images: string) {
  const isBackendLocalhost =
    images.startsWith("http://localhost:9000") ||
    images.startsWith("https://localhost:9000")

  if (isBackendLocalhost) {
    return images
      .replace("http://localhost:9000", backendUrl)
      .replace("https://localhost:9000", backendUrl)
  }

  // MinIO public URL (port 9002) — keep as-is, accessible directly from browser
  return images
}
