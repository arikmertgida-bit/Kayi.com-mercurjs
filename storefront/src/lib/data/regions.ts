"use server"

import { sdk } from "../config"
import medusaError from "@/lib/helpers/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { logger } from "@/lib/logger"
import { unstable_cache } from "next/cache"
import { getCacheOptions } from "./cookies"

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
    revalidate: 3600,
  }

  return sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
    .catch(medusaError)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
    revalidate: 3600,
  }

  return sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
    .catch(medusaError)
}

const getCachedRegionMap = unstable_cache(
  async (): Promise<Record<string, HttpTypes.StoreRegion>> => {
    const regions = await listRegions()
    const map: Record<string, HttpTypes.StoreRegion> = {}
    if (regions) {
      regions.forEach((region) => {
        region.countries?.forEach((c) => {
          map[c?.iso_2 ?? ""] = region
        })
      })
    }
    return map
  },
  ["region-map"],
  { revalidate: 3600, tags: ["regions"] }
)

export const getRegion = async (countryCode: string) => {
  try {
    const regionMap = await getCachedRegionMap()
    if (countryCode && regionMap[countryCode]) {
      return regionMap[countryCode]
    }
    // Fall back to the first available region from the database (Single Source of Truth).
    // This prevents hardcoded country strings from leaking into the codebase.
    const firstRegion = Object.values(regionMap)[0] ?? null
    return firstRegion
  } catch (e: unknown) {
    logger.error("[getRegion] error for countryCode:", countryCode, e instanceof Error ? e.message : String(e))
    return null
  }
}
