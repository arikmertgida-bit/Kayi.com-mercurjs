import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../modules/meilisearch"
import MeilisearchModuleService from "../../modules/meilisearch/service"

export type SyncProductsStepInput = {
  products: {
    id: string
    title: string
    description?: string
    handle: string
    thumbnail?: string
    categories: {
      id: string
      name: string
      handle: string
    }[]
    tags: {
      id: string
      value: string
    }[]
    [key: string]: unknown
  }[]
}

export const syncProductsStep = createStep(
  "sync-products",
  async ({ products }: SyncProductsStepInput, { container }) => {
    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    const existingProducts = await meilisearchModuleService.retrieveFromIndex(
      products.map((product) => product.id),
      "product"
    )

    // O(n²) .some() yerine O(1) Set lookup — büyük kataloglarda önemli CPU tasarrufu sağlar
    const existingIds = new Set(existingProducts.map((p: any) => p.id))
    const newProducts = products.filter((product) => !existingIds.has(product.id))

    await meilisearchModuleService.indexData(
      products as unknown as Record<string, unknown>[],
      "product"
    )

    return new StepResponse(undefined, {
      newProducts: newProducts.map((product) => product.id),
      existingProducts,
    })
  },
  async (input, { container }) => {
    if (!input) return
    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    if (input.newProducts?.length) {
      await meilisearchModuleService.deleteFromIndex(
        input.newProducts,
        "product"
      )
    }
    if (input.existingProducts?.length) {
      await meilisearchModuleService.indexData(
        input.existingProducts,
        "product"
      )
    }
  }
)
