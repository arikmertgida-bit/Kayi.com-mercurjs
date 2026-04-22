import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { syncProductsStep, SyncProductsStepInput } from "./steps/sync-products"
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch"

type SyncProductsWorkflowInput = {
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
}

export const syncProductsWorkflow = createWorkflow(
  "sync-products",
  ({ filters, limit, offset }: SyncProductsWorkflowInput) => {
    const { data: products, metadata } = useQueryGraphStep({
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
      pagination: {
        take: limit,
        skip: offset,
      },
      filters,
    })

    const { publishedProducts, unpublishedProductsToDelete } = transform(
      { products },
      (data) => {
        const publishedProducts: SyncProductsStepInput["products"] = []
        const unpublishedProductsToDelete: string[] = []

        const OPTION_FIELD_MAP: Record<string, string> = {
          // Color
          color: "color", renk: "color", colour: "color",
          // Size
          size: "size", numara: "size", beden: "size", boyut: "size",
          // Condition
          condition: "condition", durum: "condition",
        }

        data.products.forEach((product: any) => {
          if (product.status === "published") {
            const { status, ...rest } = product
            const mappedVariants = (rest.variants || []).map((variant: any) => {
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
            publishedProducts.push(
              { ...rest, variants: mappedVariants } as SyncProductsStepInput["products"][0]
            )
          } else {
            unpublishedProductsToDelete.push(product.id)
          }
        })

        return { publishedProducts, unpublishedProductsToDelete }
      }
    )

    syncProductsStep({ products: publishedProducts })
    deleteProductsFromMeilisearchStep({ ids: unpublishedProductsToDelete })

    return new WorkflowResponse({ products, metadata })
  }
)
