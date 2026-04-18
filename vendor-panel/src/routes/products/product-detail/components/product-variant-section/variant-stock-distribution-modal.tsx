import { Spinner } from "@medusajs/icons"
import { Button, Heading, Input, Text, toast } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useBatchInventoryItemsLocationLevels,
  useMultipleInventoryItemLevels,
} from "../../../../../hooks/api"
import { ExtendedAdminProductVariant } from "../../../../../types/products"

type VariantRow = {
  variantId: string
  title: string
  sku: string | null
  inventoryItemId: string
  currentTotal: number
  inputValue: string
}

type VariantStockDistributionModalProps = {
  variants: ExtendedAdminProductVariant[]
  open: boolean
  onClose: () => void
}

export const VariantStockDistributionModal = ({
  variants,
  open,
  onClose,
}: VariantStockDistributionModalProps) => {
  const { t } = useTranslation()

  // Only single-inventory-item variants (not kits)
  const eligibleVariants = useMemo(
    () =>
      variants.filter(
        (v) =>
          v.manage_inventory !== false &&
          (v.inventory_items?.length ?? 0) === 1
      ),
    [variants]
  )

  const inventoryItemIds = useMemo(
    () =>
      eligibleVariants
        .map((v) => v.inventory_items![0].inventory_item_id)
        .filter(Boolean),
    [eligibleVariants]
  )

  const { inventoryItemsWithLevels, isPending: isLevelsLoading } =
    useMultipleInventoryItemLevels(inventoryItemIds)

  const initialRows = useMemo<VariantRow[]>(() => {
    return eligibleVariants.map((v) => {
      const itemId = v.inventory_items![0].inventory_item_id
      const levels =
        inventoryItemsWithLevels.find((x) => x.inventory_item_id === itemId)
          ?.location_levels ?? []
      const total = levels.reduce(
        (acc, l) => acc + (l.stocked_quantity ?? 0),
        0
      )
      return {
        variantId: v.id,
        title: v.title ?? "",
        sku: v.sku ?? null,
        inventoryItemId: itemId,
        currentTotal: total,
        inputValue: String(total),
      }
    })
  }, [eligibleVariants, inventoryItemsWithLevels])

  const [rows, setRows] = useState<VariantRow[]>([])
  const [bulkInput, setBulkInput] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  // Sync rows when levels load
  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  const { mutateAsync: batchUpdate, isPending: isSaving } =
    useBatchInventoryItemsLocationLevels()

  const handleRowChange = (variantId: string, value: string) => {
    if (!/^\d*$/.test(value)) return
    setRows((prev) =>
      prev.map((r) =>
        r.variantId === variantId ? { ...r, inputValue: value } : r
      )
    )
  }

  const handleEqualDistribute = () => {
    const total = parseInt(bulkInput || "0", 10)
    if (isNaN(total) || rows.length === 0) return
    const base = Math.floor(total / rows.length)
    const remainder = total % rows.length
    setRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        inputValue: String(base + (idx === 0 ? remainder : 0)),
      }))
    )
  }

  const handleProportionalDistribute = () => {
    const total = parseInt(bulkInput || "0", 10)
    if (isNaN(total) || rows.length === 0) return
    const currentSum = rows.reduce(
      (acc, r) => acc + (r.currentTotal || 0),
      0
    )
    if (currentSum === 0) {
      handleEqualDistribute()
      return
    }
    let distributed = 0
    const updated = rows.map((r, idx) => {
      if (idx === rows.length - 1) {
        return { ...r, inputValue: String(total - distributed) }
      }
      const share = Math.round((r.currentTotal / currentSum) * total)
      distributed += share
      return { ...r, inputValue: String(share) }
    })
    setRows(updated)
  }

  const handleSave = async () => {
    const allLevels = inventoryItemsWithLevels

    const updates: HttpTypes.AdminBatchInventoryItemsLocationLevels["update"] =
      []

    for (const row of rows) {
      const newTotal = parseInt(row.inputValue || "0", 10)
      if (isNaN(newTotal)) continue
      const levels =
        allLevels.find((x) => x.inventory_item_id === row.inventoryItemId)
          ?.location_levels ?? []
      if (levels.length === 0) continue
      const n = levels.length
      const base = Math.floor(newTotal / n)
      const remainder = newTotal % n
      levels.forEach((lvl, idx) => {
        updates.push({
          inventory_item_id: row.inventoryItemId,
          location_id: lvl.location_id,
          stocked_quantity: base + (idx === 0 ? remainder : 0),
        })
      })
    }

    await batchUpdate(
      { create: [], update: updates, delete: [], force: true },
      {
        onSuccess: () => {
          toast.success(t("products.stock.distributionSuccess"))
          setIsSaved(true)
          setTimeout(() => {
            setIsSaved(false)
            onClose()
          }, 600)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-ui-bg-base relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <Heading level="h2">
              {t("products.stock.distributionTitle")}
            </Heading>
            <Text className="text-ui-fg-subtle mt-0.5 text-sm">
              {t("products.stock.distributionHint")}
            </Text>
          </div>
        </div>

        {/* bulk distribute bar */}
        <div className="flex items-center gap-2 border-b px-6 py-3">
          <Input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder={t("products.stock.bulkInputPlaceholder")}
            value={bulkInput}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) setBulkInput(e.target.value)
            }}
            className="w-28"
            size="small"
          />
          <Button
            variant="secondary"
            size="small"
            onClick={handleEqualDistribute}
            disabled={!bulkInput}
          >
            {t("products.stock.equalDistribute")}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={handleProportionalDistribute}
            disabled={!bulkInput}
          >
            {t("products.stock.proportionalDistribute")}
          </Button>
        </div>

        {/* variant rows */}
        <div className="flex-1 overflow-y-auto">
          {isLevelsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ui-bg-subtle sticky top-0">
                <tr>
                  <th className="text-ui-fg-subtle px-6 py-2 text-left font-medium">
                    {t("fields.title")}
                  </th>
                  <th className="text-ui-fg-subtle px-4 py-2 text-left font-medium">
                    {t("fields.sku")}
                  </th>
                  <th className="text-ui-fg-subtle px-4 py-2 text-right font-medium">
                    {t("fields.totalStock")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.variantId} className="hover:bg-ui-bg-subtle">
                    <td className="px-6 py-2.5">
                      <span className="text-ui-fg-base">{row.title || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-ui-fg-subtle font-mono text-xs">
                        {row.sku || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        value={row.inputValue}
                        onChange={(e) =>
                          handleRowChange(row.variantId, e.target.value)
                        }
                        className="w-20 rounded border border-transparent bg-transparent px-2 py-1 text-right text-sm tabular-nums outline-none transition-colors focus:border-ui-border-interactive focus:bg-ui-bg-base hover:border-ui-border-base"
                        aria-label={`${t("fields.totalStock")} – ${row.title}`}
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-ui-fg-muted px-6 py-8 text-center"
                    >
                      {t("products.stock.noEligibleVariants")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="secondary" size="small" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            size="small"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isLevelsLoading || rows.length === 0}
          >
            {isSaved ? t("actions.saved") : t("actions.save")}
          </Button>
        </div>
      </div>
    </div>
  )
}
