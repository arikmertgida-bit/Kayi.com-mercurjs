/**
 * Provisions a search-only MeiliSearch API key scoped to the products index.
 * This key is safe to expose in the browser (read-only, single index).
 *
 * Run once at backend startup (before medusa start). Idempotent — safe to re-run.
 *
 * After first run, retrieve the key value from container logs:
 *   docker compose logs backend | grep MEILI-SEARCH-KEY
 *
 * Then set MEILISEARCH_SEARCH_KEY=<value> in your environment and rebuild the storefront:
 *   docker compose build storefront && docker compose up -d storefront
 */

// Must be a valid UUID — MeiliSearch rejects non-UUID uid values
const KEY_UID = "b7e3a1c0-4f82-4d9e-9c7b-1a2f3e4d5c6b"

export default async function createSearchKey(): Promise<void> {
  const host = process.env.MEILISEARCH_HOST
  const apiKey = process.env.MEILISEARCH_API_KEY
  const indexName = process.env.MEILISEARCH_PRODUCT_INDEX_NAME || "products"

  if (!host || !apiKey) {
    console.log(
      "[MEILI-SEARCH-KEY] Credentials not found, skipping key provisioning"
    )
    return
  }

  try {
    const { MeiliSearch } = await import("meilisearch")
    const client = new MeiliSearch({ host, apiKey })

    // Check if the key already exists (idempotent)
    let existingKey: Awaited<ReturnType<typeof client.getKey>> | null = null
    try {
      existingKey = await client.getKey(KEY_UID)
    } catch {
      // Key not found — will create below
    }

    if (existingKey) {
      console.log(
        `[MEILI-SEARCH-KEY] Search key exists (uid: ${KEY_UID}): ${existingKey.key}`
      )
      console.log(
        `[MEILI-SEARCH-KEY] Set MEILISEARCH_SEARCH_KEY=${existingKey.key} in your .env then rebuild storefront`
      )
      return
    }

    const newKey = await client.createKey({
      uid: KEY_UID,
      name: "Kayı.com Storefront Search Key",
      description:
        "Read-only search key for the storefront. Scoped to the products index only.",
      actions: ["search"],
      indexes: [indexName],
      expiresAt: null,
    })

    console.log(
      `[MEILI-SEARCH-KEY] Search key created (uid: ${KEY_UID}): ${newKey.key}`
    )
    console.log(
      `[MEILI-SEARCH-KEY] Set MEILISEARCH_SEARCH_KEY=${newKey.key} in your .env then rebuild storefront`
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[MEILI-SEARCH-KEY] Failed to provision search key: ${message}`)
    // Non-fatal — backend can still start without the scoped key
  }
}

// Self-execute when run directly (e.g., from Docker CMD)
if (require.main === module) {
  createSearchKey().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[MEILI-SEARCH-KEY] Script failed:", message)
    process.exit(0) // Non-fatal — do not block backend startup
  })
}
