import React, { memo } from "react"
import {
  Button,
  Input,
  Label,
  Select,
  Text,
} from "@medusajs/ui"
import { Trash, Plus } from "@medusajs/icons"
import type { BulkProductEntry } from "../../../../hooks/api/products"

type Props = {
  index: number
  entry: BulkProductEntry
  hasError?: boolean
  stockLocations: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  tags: { id: string; value: string }[]
  types: { id: string; value: string }[]
  collections: { id: string; title: string }[]
  onChange: (index: number, updated: BulkProductEntry) => void
  onRemove: (index: number) => void
}

const ProductEntryRow = ({
  index,
  entry,
  hasError,
  stockLocations,
  categories,
  tags,
  types,
  collections,
  onChange,
  onRemove,
}: Props) => {
  const update = (patch: Partial<BulkProductEntry>) => {
    onChange(index, { ...entry, ...patch })
  }

  const addVariant = () => {
    onChange(index, {
      ...entry,
      variants: [
        ...(entry.variants ?? []),
        { option_value: "", price: 0, stock: 0 },
      ],
    })
  }

  const updateVariant = (
    vi: number,
    patch: Partial<{ option_value: string; sku: string; price: number; stock: number }>
  ) => {
    const updated = (entry.variants ?? []).map((v, idx) =>
      idx === vi ? { ...v, ...patch } : v
    )
    onChange(index, { ...entry, variants: updated })
  }

  const removeVariant = (vi: number) => {
    const updated = (entry.variants ?? []).filter((_, idx) => idx !== vi)
    onChange(index, { ...entry, variants: updated })
  }

  return (
    <div
      className={`border rounded-lg p-4 space-y-4 bg-ui-bg-base ${
        hasError ? "border-ui-tag-red-border ring-1 ring-ui-tag-red-border" : "border-ui-border-base"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Text weight="plus" size="base">
          Ürün #{index + 1}
        </Text>
        <Button
          variant="transparent"
          size="small"
          type="button"
          onClick={() => onRemove(index)}
          className="text-ui-fg-error hover:text-ui-fg-error"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor={`title-${index}`} size="small">
          Ürün Adı <span className="text-ui-fg-error">*</span>
        </Label>
        <Input
          id={`title-${index}`}
          value={entry.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Ürün adı girin"
          className={hasError && !entry.title ? "ring-1 ring-ui-tag-red-border" : ""}
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor={`desc-${index}`} size="small">
          Açıklama
        </Label>
        <textarea
          id={`desc-${index}`}
          value={entry.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Ürün açıklaması"
          rows={2}
          className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive resize-none"
        />
      </div>

      {/* Thumbnail */}
      <div className="space-y-1">
        <Label htmlFor={`thumb-${index}`} size="small">
          Thumbnail URL
        </Label>
        <Input
          id={`thumb-${index}`}
          type="url"
          value={entry.thumbnail ?? ""}
          onChange={(e) => update({ thumbnail: e.target.value })}
          placeholder="https://..."
        />
      </div>

      {/* Category, Type, Collection — 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label size="small">Kategori</Label>
          <Select
            value={entry.category_id ?? ""}
            onValueChange={(v) => update({ category_id: v || undefined })}
          >
            <Select.Trigger>
              <Select.Value placeholder="Seçin" />
            </Select.Trigger>
            <Select.Content>
              {categories.map((c) => (
                <Select.Item key={c.id} value={c.id}>
                  {c.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="space-y-1">
          <Label size="small">Ürün Tipi</Label>
          <Select
            value={entry.type_id ?? ""}
            onValueChange={(v) => update({ type_id: v || undefined })}
          >
            <Select.Trigger>
              <Select.Value placeholder="Seçin" />
            </Select.Trigger>
            <Select.Content>
              {types.map((t) => (
                <Select.Item key={t.id} value={t.id}>
                  {t.value}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="space-y-1">
          <Label size="small">Koleksiyon</Label>
          <Select
            value={entry.collection_id ?? ""}
            onValueChange={(v) => update({ collection_id: v || undefined })}
          >
            <Select.Trigger>
              <Select.Value placeholder="Seçin" />
            </Select.Trigger>
            <Select.Content>
              {collections.map((c) => (
                <Select.Item key={c.id} value={c.id}>
                  {c.title}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label htmlFor={`tags-${index}`} size="small">
          Etiketler (virgülle ayırın)
        </Label>
        <Input
          id={`tags-${index}`}
          value={(entry.tags ?? []).join(", ")}
          onChange={(e) => {
            const val = e.target.value
            const arr = val
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
            update({ tags: arr.length ? arr : undefined })
          }}
          placeholder="etiket1, etiket2"
        />
      </div>

      {/* Stock Location & Status — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label size="small">Stok Lokasyonu</Label>
          <Select
            value={entry.stock_location_id ?? ""}
            onValueChange={(v) => update({ stock_location_id: v || undefined })}
          >
            <Select.Trigger>
              <Select.Value placeholder="Seçin" />
            </Select.Trigger>
            <Select.Content>
              {stockLocations.map((sl) => (
                <Select.Item key={sl.id} value={sl.id}>
                  {sl.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="space-y-1">
          <Label size="small">Durum</Label>
          <Select
            value={entry.status}
            onValueChange={(v) => update({ status: v as "draft" | "proposed" })}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="proposed">Yayınla</Select.Item>
              <Select.Item value="draft">Taslak</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      {/* Product type radio */}
      <div className="space-y-2">
        <Label size="small">Ürün Yapısı</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`product_type-${index}`}
              value="simple"
              checked={entry.product_type === "simple"}
              onChange={() => update({ product_type: "simple", variants: undefined })}
              className="accent-ui-bg-interactive"
            />
            <Text size="small">Tekil Ürün</Text>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`product_type-${index}`}
              value="variant"
              checked={entry.product_type === "variant"}
              onChange={() =>
                update({
                  product_type: "variant",
                  variants: entry.variants?.length
                    ? entry.variants
                    : [{ option_value: "", price: 0, stock: 0 }],
                })
              }
              className="accent-ui-bg-interactive"
            />
            <Text size="small">Varyasyonlu Ürün</Text>
          </label>
        </div>
      </div>

      {/* Simple fields */}
      {entry.product_type === "simple" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`sku-${index}`} size="small">
              SKU
            </Label>
            <Input
              id={`sku-${index}`}
              value={entry.sku ?? ""}
              onChange={(e) => update({ sku: e.target.value || undefined })}
              placeholder="SKU-001"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`price-${index}`} size="small">
              Fiyat (TL)
            </Label>
            <Input
              id={`price-${index}`}
              type="number"
              min={0}
              step={0.01}
              value={entry.price ?? 0}
              onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`stock-${index}`} size="small">
              Stok
            </Label>
            <Input
              id={`stock-${index}`}
              type="number"
              min={0}
              value={entry.stock ?? 0}
              onChange={(e) => update({ stock: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      {/* Variant fields */}
      {entry.product_type === "variant" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`option_name-${index}`} size="small">
              Varyasyon Adı (örn: Renk, Beden)
            </Label>
            <Input
              id={`option_name-${index}`}
              value={entry.option_name ?? ""}
              onChange={(e) => update({ option_name: e.target.value || undefined })}
              placeholder="Renk"
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-ui-fg-subtle px-1">
              <span>Değer</span>
              <span>SKU</span>
              <span>Fiyat (TL)</span>
              <span>Stok</span>
              <span />
            </div>
            {(entry.variants ?? []).map((v, vi) => (
              <div
                key={vi}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center"
              >
                <Input
                  value={v.option_value}
                  onChange={(e) => updateVariant(vi, { option_value: e.target.value })}
                  placeholder="Kırmızı"
                  size="small"
                />
                <Input
                  value={v.sku ?? ""}
                  onChange={(e) =>
                    updateVariant(vi, { sku: e.target.value || undefined })
                  }
                  placeholder="SKU-001"
                  size="small"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={v.price}
                  onChange={(e) =>
                    updateVariant(vi, { price: parseFloat(e.target.value) || 0 })
                  }
                  size="small"
                />
                <Input
                  type="number"
                  min={0}
                  value={v.stock ?? 0}
                  onChange={(e) =>
                    updateVariant(vi, { stock: parseInt(e.target.value) || 0 })
                  }
                  size="small"
                />
                <Button
                  variant="transparent"
                  size="small"
                  type="button"
                  onClick={() => removeVariant(vi)}
                  className="text-ui-fg-error hover:text-ui-fg-error px-1"
                >
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="small"
              type="button"
              onClick={addVariant}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Varyasyon Ekle
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ProductEntryRow)
