export default async function initMeilisearch() {
  const host = process.env.MEILISEARCH_HOST
  const apiKey = process.env.MEILISEARCH_API_KEY
  const indexName = process.env.MEILISEARCH_PRODUCT_INDEX_NAME || "products"

  if (!host || !apiKey) {
    console.log(
      "[MEILISEARCH] Credentials not found, skipping index initialization"
    )
    return
  }

  try {
    const { MeiliSearch } = await import("meilisearch")
    const client = new MeiliSearch({ host, apiKey })

    console.log(`[MEILISEARCH] Checking index '${indexName}'...`)

    try {
      await client.getIndex(indexName)
      console.log(`[MEILISEARCH] Index '${indexName}' already exists`)
    } catch {
      console.log(`[MEILISEARCH] Creating index '${indexName}'...`)
      const task = await client.createIndex(indexName, { primaryKey: "id" })
      await client.waitForTask(task.taskUid)
      console.log(`[MEILISEARCH] Index '${indexName}' created`)
    }

    const index = client.index(indexName)

    // filterableAttributes — sidebar filtreleri için zorunlu
    const filterableAttributes = [
      "seller.handle",
      "seller.store_status",
      "supported_countries",
      "variants.prices.currency_code",
      "variants.prices.amount",
      "categories.id",
      "categories.handle",
      "collection.id",
      "collection.handle",
      "variants.condition",
      "variants.color",
      "variants.size",
      "status",
    ]

    const sortableAttributes = ["created_at", "title"]

    const searchableAttributes = [
      "title",
      "description",
      "handle",
      "categories.name",
      "tags.value",
      "variants.title",
      "variants.sku",
    ]

    console.log("[MEILISEARCH] Configuring filterableAttributes...")
    const t1 = await index.updateFilterableAttributes(filterableAttributes)
    await client.waitForTask(t1.taskUid)

    console.log("[MEILISEARCH] Configuring sortableAttributes...")
    const t2 = await index.updateSortableAttributes(sortableAttributes)
    await client.waitForTask(t2.taskUid)

    console.log("[MEILISEARCH] Configuring searchableAttributes...")
    const t3 = await index.updateSearchableAttributes(searchableAttributes)
    await client.waitForTask(t3.taskUid)

    console.log("[MEILISEARCH] Index configured successfully")
  } catch (error) {
    console.error(`[MEILISEARCH] Failed to initialize: ${error}`)
  }
}
