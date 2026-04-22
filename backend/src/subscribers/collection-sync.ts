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
  // Koleksiyondaki tüm ürünleri yeniden senkronize et
  await syncProductsWorkflow(container).run({
    input: {},
  })
}

export const config: SubscriberConfig = {
  event: [
    "product-collection.updated",
    "product-collection.created",
    "product-collection.deleted",
  ],
}
