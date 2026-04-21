import { instantMeiliSearch } from "@meilisearch/instant-meilisearch"

const meilisearchHost = process.env.NEXT_PUBLIC_MEILISEARCH_HOST || ""
const meilisearchApiKey =
  process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || ""

export const client = meilisearchHost
  ? instantMeiliSearch(meilisearchHost, meilisearchApiKey, {
      finitePagination: true,
    }).searchClient
  : null
