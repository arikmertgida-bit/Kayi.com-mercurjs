import { Component, LockClosedSolidMini } from "@medusajs/icons"
import { Tooltip } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useInventoryItemLevels, useBatchInventoryItemLocationLevels } from "../../../../../hooks/api"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { ExtendedAdminProductVariant } from "../../../../../types/products"

type StockCellProps = {
  variant: ExtendedAdminProductVariant
}

export const StockCell = ({ variant }: StockCellProps) => {
  const { t } = useTranslation()

  const inventoryItems = variant.inventory_items ?? []
  const managesInventory = variant.manage_inventory !== false
  const isInventoryKit = inventoryItems.length > 1
  const inventoryItemId = inventoryItems[0]?.inventory_item_id

  const { location_levels, isLoading } = useInventoryItemLevels(
    inventoryItemId!,
    undefined,
    { enabled: !!inventoryItemId && managesInventory && !isInventoryKit }
  )

  const { stock_locations, isPending: isLocationsLoading } = useStockLocations(
    undefined,
    { enabled: !!inventoryItemId && managesInventory && !isInventoryKit }
  )

  const totalStocked =
    location_levels?.reduce(
      (acc, l) => acc + (l.stocked_quantity ?? 0),
      0
    ) ?? 0

  const [inputValue, setInputValue] = useState<string>(
    String(totalStocked)
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMounted = useRef(false)

  const { mutateAsync: batchUpdate, isPending } =
    useBatchInventoryItemLocationLevels(inventoryItemId!)

  // Sync input when server data loads / changes (e.g. after save)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      setInputValue(String(totalStocked))
      return
    }
    if (!isPending) {
      setInputValue(String(totalStocked))
    }
  }, [totalStocked, isPending])

  if (!managesInventory) {
    return (
      <div className="flex h-full items-center px-3">
        <span className="text-ui-fg-muted">—</span>
      </div>
    )
  }

  if (isInventoryKit) {
    const kitTotal = inventoryItems.reduce((acc, item) => {
      const levels = item.inventory?.location_levels ?? []
      return acc + levels.reduce((s, l) => s + (l.stocked_quantity ?? 0), 0)
    }, 0)

    return (
      <Tooltip content={t("products.stock.inventoryKitTooltip")}>
        <div className="flex h-full items-center gap-x-1.5 px-3">
          <Component className="text-ui-fg-muted shrink-0" />
          <span className="text-ui-fg-muted">{kitTotal}</span>
          <LockClosedSolidMini className="text-ui-fg-muted shrink-0" />
        </div>
      </Tooltip>
    )
  }

  if (!inventoryItemId) {
    return (
      <div className="flex h-full items-center px-3">
        <span className="text-ui-fg-muted">—</span>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (!/^\d*$/.test(raw)) return
    setInputValue(raw)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const newTotal = parseInt(raw || "0", 10)
      if (isNaN(newTotal) || newTotal < 0) return

      const existingLevels = location_levels ?? []

      if (existingLevels.length > 0) {
        // Mevcut location level'ları güncelle
        const n = existingLevels.length
        const base = Math.floor(newTotal / n)
        const remainder = newTotal % n

        const updates: HttpTypes.AdminBatchInventoryItemLocationLevels["update"] =
          existingLevels.map((lvl, idx) => ({
            location_id: lvl.location_id,
            stocked_quantity: base + (idx === 0 ? remainder : 0),
          }))

        await batchUpdate({ create: [], update: updates, delete: [] })
      } else {
        // Hiç location level yok — tüm stock location'lara yeni level oluştur
        const locations = stock_locations ?? []
        if (locations.length === 0) return

        const n = locations.length
        const base = Math.floor(newTotal / n)
        const remainder = newTotal % n

        const creates: HttpTypes.AdminBatchInventoryItemLocationLevels["create"] =
          locations.map((loc, idx) => ({
            location_id: loc.id,
            stocked_quantity: base + (idx === 0 ? remainder : 0),
          }))

        await batchUpdate({ create: creates, update: [], delete: [] })
      }
    }, 500)
  }

  return (
    <div className="flex h-full items-center px-3">
      <input
        type="text"
        inputMode="numeric"
        pattern="\d*"
        value={inputValue}
        onChange={handleChange}
        disabled={isPending || isLoading}
        className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm tabular-nums outline-none transition-colors focus:border-ui-border-interactive focus:bg-ui-bg-base hover:border-ui-border-base disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t("fields.totalStock")}
      />
    </div>
  )
}
