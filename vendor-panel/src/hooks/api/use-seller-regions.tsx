import { useMemo } from "react"
import { useSellerRegionIds } from "./users"
import { useRegions } from "./regions"

/**
 * useSellerRegions
 *
 * Combines the authenticated seller's region IDs (from /vendor/sellers/me/regions)
 * with the full region list fetched from /vendor/regions.
 *
 * - If the seller has selected regions → only those regions are returned.
 * - If no regions are selected (new account) → all regions are returned as
 *   a graceful fallback, so pricing forms are never empty.
 *
 * This hook is the Single Source of Truth for which regions/currencies are
 * available in the product pricing UI.
 */
export const useSellerRegions = () => {
  const { region_ids: selectedIds, isPending: isRegionIdsPending } = useSellerRegionIds()
  const { regions: allRegions, isPending: isRegionsPending } = useRegions({
    limit: 9999,
  })

  const sellerRegions = useMemo(() => {
    const all = allRegions ?? []
    if (selectedIds.length === 0) {
      // No regions selected yet — expose all so pricing columns are visible
      return all
    }
    return all.filter((r) => selectedIds.includes(r.id))
  }, [allRegions, selectedIds])

  const sellerCurrencies = useMemo(
    () =>
      Array.from(
        new Set(
          sellerRegions
            .map((r) => r.currency_code)
            .filter((c): c is string => Boolean(c))
        )
      ),
    [sellerRegions]
  )

  return {
    sellerRegions,
    sellerCurrencies,
    selectedIds,
    allRegions: allRegions ?? [],
    isPending: isRegionIdsPending || isRegionsPending,
  }
}
