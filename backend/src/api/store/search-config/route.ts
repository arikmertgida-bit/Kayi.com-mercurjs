import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/search-config
 * Public endpoint — no auth required.
 * Returns the MeiliSearch host and the pre-provisioned scoped search key
 * so the storefront can use them at runtime instead of baking the key into the build.
 *
 * The KEY_UID matches the constant in backend/src/scripts/create-search-key.ts.
 * If MeiliSearch is unreachable or the key has not been provisioned yet,
 * returns { host, key: "" } — never throws a 500.
 */

// Must match KEY_UID in create-search-key.ts — used to look up the provisioned scoped key
const KEY_UID = "b7e3a1c0-4f82-4d9e-9c7b-1a2f3e4d5c6b"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const host = process.env.MEILISEARCH_HOST || ""
  const apiKey = process.env.MEILISEARCH_API_KEY || ""

  if (!host || !apiKey) {
    return res.json({ host, key: "" })
  }

  try {
    const { MeiliSearch } = await import("meilisearch")
    const client = new MeiliSearch({ host, apiKey })
    const scopedKey = await client.getKey(KEY_UID)
    return res.json({ host, key: scopedKey.key })
  } catch {
    // MeiliSearch unreachable or key not yet provisioned — return empty key (non-fatal)
    return res.json({ host, key: "" })
  }
}
