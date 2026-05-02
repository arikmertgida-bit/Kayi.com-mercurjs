import { instantMeiliSearch } from "@meilisearch/instant-meilisearch"

/**
 * Factory function that creates a MeiliSearch search client from runtime credentials.
 * Returns null when host or key is missing (graceful degradation — no search).
 *
 * Replaces the previous module-level singleton that baked NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY
 * into the build. Credentials now come from the MeiliSearchProvider at runtime via
 * /store/search-config on the backend.
 */
export function createMeiliSearchClient(host: string, key: string) {
  if (!host || !key) return null
  return instantMeiliSearch(host, key, { finitePagination: true }).searchClient
}
