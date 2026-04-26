import { MedusaContainer } from "@medusajs/framework"
import { syncProductsWorkflow } from "../workflows/sync-products"

export default async function syncMeiliSearchJob(container: MedusaContainer) {
  console.log("[MEILISEARCH-JOB] Starting sync at:", new Date().toISOString())
  try {
    await syncProductsWorkflow(container).run({
      input: {},
    })
    console.log("[MEILISEARCH-JOB] Sync completed successfully")
  } catch (error) {
    console.error("[MEILISEARCH-JOB] Sync failed:", error?.message || error)
  }
}

export const config = {
  name: "sync-meilisearch-products",
  // Saatte bir fallback sync — gerçek zamanlı güncelleme product-sync.ts subscriber'ı tarafından yapılır.
  // Her 2 dakikada bir çalıştırmak gereksiz DB/CPU yükü oluşturuyordu.
  schedule: "0 * * * *",
}
