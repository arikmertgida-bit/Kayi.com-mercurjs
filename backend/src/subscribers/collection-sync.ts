import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { syncProductsWorkflow } from "../workflows/sync-products"

/**
 * Koleksiyona ürün eklendiğinde veya çıkarıldığında MeiliSearch'ü otomatik günceller.
 * product-collection.updated: Admin panelinden koleksiyona ürün ekle/çıkar işlemlerinde tetiklenir.
 * product-collection.created / deleted: Koleksiyon oluşturulduğunda/silindiğinde tetiklenir.
 */
export default async function handleCollectionChanges({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // Yalnızca bu koleksiyona ait ürünleri sync et — tüm kataloğu değil.
  // Bu olmadan her koleksiyon değişikliği 10K+ ürün için DB sorgusu + Meilisearch re-index tetikliyordu.
  await syncProductsWorkflow(container).run({
    input: {
      filters: {
        collection_id: data.id,
      },
    },
  })
}

export const config: SubscriberConfig = {
  event: [
    "product-collection.updated",
    "product-collection.created",
    "product-collection.deleted",
  ],
}
