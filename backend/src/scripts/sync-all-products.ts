import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"

export default async function syncAllProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const meilisearch = container.resolve(MEILISEARCH_MODULE) as any

  logger.info("[MEILISEARCH] Starting full product sync...")

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "description",
      "handle",
      "thumbnail",
      "status",
      "categories.id",
      "categories.name",
      "categories.handle",
      "tags.id",
      "tags.value",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.options.value",
      "variants.options.option.title",
      "variants.prices.currency_code",
      "variants.prices.amount",
      "collection.id",
      "collection.handle",
      "collection.title",
      "seller.id",
      "seller.handle",
      "seller.store_status",
      "seller.name",
    ],
  })

  const OPTION_FIELD_MAP: Record<string, string> = {
    // Color
    color: "color", renk: "color", colour: "color",
    // Size
    size: "size", numara: "size", beden: "size", boyut: "size",
    // Condition
    condition: "condition", durum: "condition",
  }

  const published = products
    .filter((p: any) => p.status === "published")
    .map((p: any) => {
      const mappedVariants = (p.variants || []).map((variant: any) => {
        const optionMap: Record<string, string> = {}
        ;(variant.options || []).forEach((opt: any) => {
          const rawTitle: string | undefined = opt.option?.title
          if (rawTitle && opt.value) {
            const fieldKey = OPTION_FIELD_MAP[rawTitle.toLowerCase().trim()]
            if (fieldKey) optionMap[fieldKey] = opt.value
          }
        })
        return {
          ...variant,
          ...(optionMap.color !== undefined && { color: optionMap.color }),
          ...(optionMap.size !== undefined && { size: optionMap.size }),
          ...(optionMap.condition !== undefined && { condition: optionMap.condition }),
        }
      })
      return { ...p, variants: mappedVariants }
    })
  const unpublished = products.filter((p: any) => p.status !== "published")

  logger.info(
    `[MEILISEARCH] Found ${published.length} published, ${unpublished.length} unpublished products`
  )

  if (published.length > 0) {
    await meilisearch.indexData(published)
    logger.info(`[MEILISEARCH] Indexed ${published.length} products`)
  }

  if (unpublished.length > 0) {
    const ids = unpublished.map((p: any) => p.id)
    await meilisearch.deleteFromIndex(ids)
    logger.info(`[MEILISEARCH] Removed ${unpublished.length} unpublished products from index`)
  }

  logger.info("[MEILISEARCH] Full product sync complete")
}
