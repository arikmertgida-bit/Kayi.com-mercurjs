import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../modules/meilisearch"

export type DeleteProductsFromMeilisearchStep = {
  ids: string[]
}

export const deleteProductsFromMeilisearchStep = createStep(
  "delete-products-from-meilisearch-step",
  async ({ ids }: DeleteProductsFromMeilisearchStep, { container }) => {
    if (!ids.length) {
      return new StepResponse(undefined, [])
    }

    const meilisearchModuleService = container.resolve(MEILISEARCH_MODULE)

    const existingRecords =
      await meilisearchModuleService.retrieveFromIndex(ids, "product")

    await meilisearchModuleService.deleteFromIndex(ids, "product")

    return new StepResponse(undefined, existingRecords)
  },
  async (existingRecords, { container }) => {
    if (!existingRecords?.length) return
    const meilisearchModuleService = container.resolve(MEILISEARCH_MODULE)
    await meilisearchModuleService.indexData(existingRecords, "product")
  }
)
