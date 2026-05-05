import { MedusaContainer } from "@medusajs/framework"
import { syncProductsWorkflow } from "../workflows/sync-products"

const BATCH_SIZE = 500

export default async function syncMeiliSearchJob(container: MedusaContainer) {
  console.info("[MEILISEARCH-JOB] Starting sync at:", new Date().toISOString())
  try {
    let offset = 0
    let totalSynced = 0

    while (true) {
      const result = await syncProductsWorkflow(container).run({
        input: { limit: BATCH_SIZE, offset },
      })

      const batchCount: number = (result.result.products as unknown[])?.length ?? 0
      totalSynced += batchCount

      if (batchCount < BATCH_SIZE) {
        // Last batch — no more products
        break
      }
      offset += BATCH_SIZE
    }

    console.info(
      `[MEILISEARCH-JOB] Sync completed — ${totalSynced} products processed`
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? (error as Error).message : String(error)
    console.error("[MEILISEARCH-JOB] Sync failed:", message)
  }
}

export const config = {
  name: "sync-meilisearch-products",
  // Her 5 dakikada bir tam sync — subscriber ile birlikte çalışır (fallback)
  schedule: "*/5 * * * *",
}
