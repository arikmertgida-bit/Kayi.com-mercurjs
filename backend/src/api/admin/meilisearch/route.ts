import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import MeilisearchModuleService from "../../../modules/meilisearch/service"
import { syncProductsWorkflow } from "../../../workflows/sync-products"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const meilisearchService = req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

  let productIndexExists = false
  try {
    const indexName = await meilisearchService.getIndexName("product")
    const index = await meilisearchService.search("", "product")
    productIndexExists = index !== null
  } catch {
    productIndexExists = false
  }

  res.json({
    appId: process.env.MEILISEARCH_HOST || "http://meilisearch:7700",
    productIndex: productIndexExists,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    await syncProductsWorkflow(req.scope as unknown as MedusaContainer).run({
      input: {},
    })
    res.json({ success: true, message: "Sync triggered successfully" })
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error?.message || "Sync failed" })
  }
}
