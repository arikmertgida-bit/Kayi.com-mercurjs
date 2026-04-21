import { ChevronDownMini, ChevronUpMini } from "@medusajs/icons"
import {
  Alert,
  Badge,
  Button,
  Heading,
  Input,
  Label,
  Text,
  clx,
} from "@medusajs/ui"
import {
  Controller,
  UseFormReturn,
  useFieldArray,
  useWatch,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useRef, useState } from "react"

import { Form } from "../../../../../../../components/common/form"
import { ChipInput } from "../../../../../../../components/inputs/chip-input"
import { ProductCreateSchemaType } from "../../../../types"
import { decorateVariantsWithDefaultValues } from "../../../../utils"
import { ProductCreateMediaSection } from "../product-create-details-media-section"
import { generateVariantSku } from "../../../../../../../utils/generate-sku"

type PriceColumn = { key: string; label: string }

type ProductCreateVariantsSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  priceColumns?: PriceColumn[]
}

const VariantColorImagePicker = ({
  value,
  onChange,
  hasError,
}: {
  value: File | undefined
  onChange: (file: File) => void
  hasError?: boolean
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onChange(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={clx(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
          "bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover",
          hasError ? "border-ui-fg-error" : "border-ui-border-base"
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="preview"
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-ui-bg-subtle text-ui-fg-muted text-lg">
            +
          </div>
        )}
        <span className="text-ui-fg-subtle">
          {previewUrl ? "Degistir" : "Gorsel Ekle"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

const getPermutations = (
  data: { title: string; values: string[] }[]
): { [key: string]: string }[] => {
  if (data.length === 0) return []
  if (data.length === 1)
    return data[0].values.map((value) => ({ [data[0].title]: value }))
  const toProcess = data[0]
  const rest = data.slice(1)
  return toProcess.values.flatMap((value) =>
    getPermutations(rest).map((permutation) => ({
      [toProcess.title]: value,
      ...permutation,
    }))
  )
}

const getVariantName = (options: Record<string, string>) =>
  Object.values(options).join(" / ")

const getColorKey = (options: Record<string, string>) => {
  const key = Object.keys(options).find((k) =>
    ["renk", "color"].includes(k.toLowerCase())
  )
  return key ? options[key] : null
}

const getSizeKey = (options: Record<string, string>) => {
  const key = Object.keys(options).find((k) =>
    ["beden", "numara", "size"].includes(k.toLowerCase())
  )
  return key ? options[key] : null
}

/* ────────────────── Accordion Color Group ───────────────────────────────── */
type VariantWithIndex = {
  originalIndex: number
  title: string
  options: Record<string, string>
  [key: string]: any
}

type ColorGroupProps = {
  colorName: string
  variants: VariantWithIndex[]
  form: UseFormReturn<ProductCreateSchemaType>
  priceColumns: PriceColumn[]
  isExpanded: boolean
  onToggle: () => void
}

const ColorGroup = ({
  colorName,
  variants,
  form,
  priceColumns,
  isExpanded,
  onToggle,
}: ColorGroupProps) => {
  const firstIdx = variants[0]?.originalIndex
  const firstVariantOptions = variants[0]?.options ?? {}
  const sizeKey = Object.keys(firstVariantOptions).find((k) =>
    ["beden", "numara", "size"].includes(k.toLowerCase())
  )
  const sizeLabel = sizeKey ?? "Beden"

  return (
    <div className="rounded-xl border border-ui-border-base overflow-hidden">
      {/* Color header row */}
      <div
        className="flex items-center justify-between bg-ui-bg-component px-4 py-3 cursor-pointer hover:bg-ui-bg-component-hover transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-ui-fg-muted hover:text-ui-fg-base"
          >
            {isExpanded ? (
              <ChevronUpMini className="h-4 w-4" />
            ) : (
              <ChevronDownMini className="h-4 w-4" />
            )}
          </button>
          <Text weight="plus" size="small">
            {colorName}
          </Text>
          <Badge size="xsmall" color="grey">
            {variants.length} {sizeLabel}
          </Badge>
        </div>
        {/* Color image picker per group */}
        {firstIdx !== undefined && (
          <div onClick={(e) => e.stopPropagation()}>
            <Form.Field
              control={form.control}
              name={`variants.${firstIdx}.variant_thumbnail_file` as any}
              render={({ field, fieldState }) => (
                <Form.Item>
                  <Form.Control>
                    <VariantColorImagePicker
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!fieldState.error}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>
        )}
      </div>

      {/* Size rows */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-ui-bg-subtle border-b border-ui-border-base">
                <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                  {sizeLabel}
                </th>
                <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                  SKU
                </th>
                <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                  Barkod
                </th>
                <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                  Stok
                </th>
                {priceColumns.map((col) => (
                  <th
                    key={"th-" + col.key}
                    className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap"
                  >
                    Fiyat ({col.label})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, rowIdx) => {
                const idx = variant.originalIndex
                const sizeName = getSizeKey(variant.options) ?? variant.title

                return (
                  <tr
                    key={idx}
                    className={clx(
                      "border-b border-ui-border-base last:border-b-0",
                      rowIdx % 2 === 0 ? "bg-ui-bg-base" : "bg-ui-bg-subtle"
                    )}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Text size="xsmall" weight="plus">
                        {sizeName}
                      </Text>
                    </td>
                    <td className="px-3 py-2">
                      <Form.Field
                        control={form.control}
                        name={`variants.${idx}.sku`}
                        render={({ field }) => (
                          <Form.Item>
                            <Form.Control>
                              <Input
                                {...field}
                                size="small"
                                placeholder="ABC-001"
                                className="min-w-[110px]"
                              />
                            </Form.Control>
                          </Form.Item>
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Form.Field
                        control={form.control}
                        name={`variants.${idx}.barcode`}
                        render={({ field }) => (
                          <Form.Item>
                            <Form.Control>
                              <Input
                                {...field}
                                size="small"
                                placeholder="1234567890"
                                className="min-w-[120px]"
                              />
                            </Form.Control>
                          </Form.Item>
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Form.Field
                        control={form.control}
                        name={`variants.${idx}.initial_stock`}
                        render={({ field }) => (
                          <Form.Item>
                            <Form.Control>
                              <Input
                                {...field}
                                type="number"
                                min={0}
                                size="small"
                                placeholder="0"
                                className="min-w-[70px]"
                              />
                            </Form.Control>
                          </Form.Item>
                        )}
                      />
                    </td>
                    {priceColumns.map((col) => (
                      <td key={"p-" + col.key} className="px-3 py-2">
                        <Form.Field
                          control={form.control}
                          name={`variants.${idx}.prices.${col.key}` as any}
                          render={({ field }) => (
                            <Form.Item>
                              <Form.Control>
                                <Input
                                  {...field}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  size="small"
                                  placeholder="0.00"
                                  className="min-w-[90px]"
                                />
                              </Form.Control>
                            </Form.Item>
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ────────────────── BulkEditBar ─────────────────────────────────────────── */
type BulkEditBarProps = {
  priceColumns: PriceColumn[]
  onApplyPrice: (key: string, price: string) => void
  onApplyStock: (stock: string) => void
}

const BulkEditBar = ({ priceColumns, onApplyPrice, onApplyStock }: BulkEditBarProps) => {
  const [bulkPrice, setBulkPrice] = useState<Record<string, string>>({})
  const [bulkStock, setBulkStock] = useState("")

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
      <Text size="xsmall" weight="plus" className="text-ui-fg-subtle self-center mr-1">
        Tumune Uygula:
      </Text>

      {/* Stock */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-y-1">
          <Label size="xsmall" className="text-ui-fg-muted">
            Stok
          </Label>
          <Input
            size="small"
            type="number"
            min={0}
            placeholder="0"
            className="w-24"
            value={bulkStock}
            onChange={(e) => setBulkStock(e.target.value)}
          />
        </div>
        <Button
          size="small"
          variant="secondary"
          type="button"
          onClick={() => {
            onApplyStock(bulkStock)
            setBulkStock("")
          }}
        >
          Uygula
        </Button>
      </div>

      {/* Price per currency */}
      {priceColumns.map((col) => (
        <div key={col.key} className="flex items-end gap-2">
          <div className="flex flex-col gap-y-1">
            <Label size="xsmall" className="text-ui-fg-muted">
              Fiyat ({col.label})
            </Label>
            <Input
              size="small"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              className="w-28"
              value={bulkPrice[col.key] ?? ""}
              onChange={(e) =>
                setBulkPrice((prev) => ({ ...prev, [col.key]: e.target.value }))
              }
            />
          </div>
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => {
              onApplyPrice(col.key, bulkPrice[col.key] ?? "")
              setBulkPrice((prev) => ({ ...prev, [col.key]: "" }))
            }}
          >
            Uygula
          </Button>
        </div>
      ))}
    </div>
  )
}

export const ProductCreateVariantsSection = ({
  form,
  priceColumns = [],
}: ProductCreateVariantsSectionProps) => {
  const { t } = useTranslation()

  const options = useFieldArray({ control: form.control, name: "options" })

  const watchedAreVariantsEnabled = useWatch({
    control: form.control,
    name: "enable_variants",
    defaultValue: false,
  })

  const watchedOptions = useWatch({
    control: form.control,
    name: "options",
    defaultValue: [],
  })

  const watchedVariants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  // Model Kodu: handle field
  const modelCode = useWatch({
    control: form.control,
    name: "handle",
    defaultValue: "",
  })

  // Her ürün oturumuna özgü 4-karakterlik random suffix — SKU çakışmalarını önler
  const skuSuffix = useRef(
    Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  )

  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set())

  const showInvalidOptionsMessage = !!form.formState.errors.options?.length
  const showInvalidVariantsMessage =
    form.formState.errors.variants?.root?.message === "invalid_length"

  const isColorGrouped =
    watchedAreVariantsEnabled &&
    watchedOptions.some((o) =>
      ["renk", "color"].includes(o.title?.toLowerCase() ?? "")
    )

  const rebuildVariants = (newOptions: { title: string; values: string[] }[]) => {
    const valid = newOptions.filter((o) => o.title && o.values.length > 0)
    const permutations = getPermutations(valid)
    const old = [...watchedVariants]

    const merged = permutations.map((perm) => {
      const match = old.find((v) =>
        Object.keys(perm).every((k) => v.options[k] === perm[k])
      )
      if (match) {
        return { ...match, title: getVariantName(perm), options: perm, should_create: true }
      }
      const colorVal = getColorKey(perm) ?? ""
      const sizeVal = getSizeKey(perm) ?? ""
      const autoSku = generateVariantSku(modelCode || "VND", colorVal, sizeVal) + "-" + skuSuffix.current
      return {
        ...decorateVariantsWithDefaultValues([
          {
            title: getVariantName(perm),
            options: perm,
            should_create: true,
            variant_rank: 0,
            inventory: [{ inventory_item_id: "", required_quantity: "" }],
          },
        ])[0],
        sku: autoSku,
      }
    })

    form.setValue("variants", merged)

    const allColors = new Set(
      merged.map((v) => getColorKey(v.options) ?? "__no_color__")
    )
    setExpandedColors(allColors)
  }

  const handleOptionValueUpdate = (index: number, value: string[]) => {
    const newOptions = watchedOptions.map((o, i) =>
      i === index ? { ...o, values: value } : o
    )
    rebuildVariants(newOptions)
  }

  const visibleVariants = watchedVariants
    .map((v, i) => ({ ...v, originalIndex: i }))
    .filter((v) => v.should_create) as VariantWithIndex[]

  const colorGroups: Record<string, VariantWithIndex[]> = {}
  const noColorVariants: VariantWithIndex[] = []

  for (const v of visibleVariants) {
    const color = getColorKey(v.options)
    if (color) {
      if (!colorGroups[color]) colorGroups[color] = []
      colorGroups[color].push(v)
    } else {
      noColorVariants.push(v)
    }
  }

  const toggleColor = (color: string) => {
    setExpandedColors((prev) => {
      const next = new Set(prev)
      if (next.has(color)) next.delete(color)
      else next.add(color)
      return next
    })
  }

  const applyBulkPrice = (key: string, price: string) => {
    visibleVariants.forEach((v) => {
      form.setValue(`variants.${v.originalIndex}.prices.${key}` as any, price)
    })
  }

  const applyBulkStock = (stock: string) => {
    visibleVariants.forEach((v) => {
      form.setValue(`variants.${v.originalIndex}.initial_stock` as any, stock)
    })
  }

  return (
    <div id="variants" className="flex flex-col gap-y-8">
      <div className="flex flex-col gap-y-6">
        <Heading level="h2">{t("products.create.variants.header")}</Heading>
      </div>

      {watchedAreVariantsEnabled ? (
        <>
          {/* Option definition */}
          <div className="flex flex-col gap-y-6">
            <Form.Field
              control={form.control}
              name="options"
              render={() => (
                <Form.Item>
                  <div className="flex flex-col gap-y-6">
                    <div className="flex items-start justify-between gap-x-4">
                      <div className="flex flex-col">
                        <Form.Label>
                          {t("products.create.variants.productOptions.label")}
                        </Form.Label>
                        <Form.Hint>
                          {t("products.create.variants.productOptions.hint")}
                        </Form.Hint>
                      </div>
                      <Button
                        size="small"
                        variant="secondary"
                        type="button"
                        onClick={() => options.append({ title: "", values: [] })}
                      >
                        {t("actions.add")}
                      </Button>
                    </div>
                    {showInvalidOptionsMessage && (
                      <Alert dismissible variant="error">
                        {t("products.create.errors.options")}
                      </Alert>
                    )}
                    <div className="w-full bg-ui-bg-component shadow-elevation-card-rest rounded-xl p-3 flex flex-col gap-y-3">
                      {options.fields.map((option, index) => (
                        <div
                          key={option.id}
                          className="grid grid-cols-[min-content,1fr] items-center gap-1.5"
                        >
                          <div className="flex items-center px-2 py-1.5 min-w-[80px]">
                            <Label
                              size="xsmall"
                              weight="plus"
                              className="text-ui-fg-subtle whitespace-nowrap"
                            >
                              {form.watch(`options.${index}.title`) ||
                                `Option ${index + 1}`}
                            </Label>
                          </div>
                          <Controller
                            control={form.control}
                            name={`options.${index}.values` as const}
                            render={({ field: { onChange, ...field } }) => (
                              <ChipInput
                                {...field}
                                variant="contrast"
                                onChange={(value) => {
                                  handleOptionValueUpdate(index, value as string[])
                                  onChange(value)
                                }}
                                placeholder={(() => {
                                  const title = (form.watch(`options.${index}.title`) ?? "").toLowerCase()
                                  if (["renk", "color"].includes(title)) return "Kırmızı, Mavi, Yeşil"
                                  if (["beden", "size"].includes(title)) return "S, M, L"
                                  if (["numara"].includes(title)) return "22, 24, 26"
                                  return t("products.fields.options.variantionsPlaceholder")
                                })()}
                              />
                            )}
                          />
                        </div>
                      ))}
                      <div className="pt-2 flex justify-center">
                        <ProductCreateMediaSection form={form} />
                      </div>
                    </div>
                  </div>
                </Form.Item>
              )}
            />
          </div>

          {/* Errors */}
          {!showInvalidOptionsMessage && showInvalidVariantsMessage && (
            <Alert dismissible variant="error">
              {t("products.create.errors.variants")}
            </Alert>
          )}

          {/* Variant accordion */}
          {visibleVariants.length > 0 && (
            <div className="flex flex-col gap-y-3">
              <Label weight="plus">
                {t("products.create.variants.productVariants.label")}
              </Label>

              {/* Bulk edit bar */}
              <BulkEditBar
                priceColumns={priceColumns}
                onApplyPrice={applyBulkPrice}
                onApplyStock={applyBulkStock}
              />

              {/* Color accordion groups */}
              {isColorGrouped ? (
                <div className="flex flex-col gap-y-2">
                  {Object.entries(colorGroups).map(([color, variants]) => (
                    <ColorGroup
                      key={color}
                      colorName={color}
                      variants={variants}
                      form={form}
                      priceColumns={priceColumns}
                      isExpanded={expandedColors.has(color)}
                      onToggle={() => toggleColor(color)}
                    />
                  ))}
                  {noColorVariants.length > 0 && (
                    <ColorGroup
                      key="__no_color__"
                      colorName="Diger"
                      variants={noColorVariants}
                      form={form}
                      priceColumns={priceColumns}
                      isExpanded={expandedColors.has("__no_color__")}
                      onToggle={() => toggleColor("__no_color__")}
                    />
                  )}
                </div>
              ) : (
                /* Flat table when no color option */
                <div className="overflow-x-auto rounded-xl border border-ui-border-base">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-ui-bg-component border-b border-ui-border-base">
                        <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                          Varyant
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                          SKU
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                          Barkod
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap">
                          Stok
                        </th>
                        {priceColumns.map((col) => (
                          <th
                            key={"ph-" + col.key}
                            className="px-3 py-2 text-left font-medium text-ui-fg-subtle whitespace-nowrap"
                          >
                            Fiyat ({col.label})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleVariants.map((variant, rowIdx) => {
                        const idx = variant.originalIndex
                        return (
                          <tr
                            key={idx}
                            className={clx(
                              "border-b border-ui-border-base last:border-b-0",
                              rowIdx % 2 === 0 ? "bg-ui-bg-base" : "bg-ui-bg-subtle"
                            )}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Text size="xsmall" weight="plus">
                                {variant.title || getVariantName(variant.options)}
                              </Text>
                            </td>
                            <td className="px-3 py-2">
                              <Form.Field
                                control={form.control}
                                name={`variants.${idx}.sku`}
                                render={({ field }) => (
                                  <Form.Item>
                                    <Form.Control>
                                      <Input
                                        {...field}
                                        size="small"
                                        placeholder="ABC-001"
                                        className="min-w-[90px]"
                                      />
                                    </Form.Control>
                                  </Form.Item>
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Form.Field
                                control={form.control}
                                name={`variants.${idx}.barcode`}
                                render={({ field }) => (
                                  <Form.Item>
                                    <Form.Control>
                                      <Input
                                        {...field}
                                        size="small"
                                        placeholder="1234567890"
                                        className="min-w-[110px]"
                                      />
                                    </Form.Control>
                                  </Form.Item>
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Form.Field
                                control={form.control}
                                name={`variants.${idx}.initial_stock`}
                                render={({ field }) => (
                                  <Form.Item>
                                    <Form.Control>
                                      <Input
                                        {...field}
                                        type="number"
                                        min={0}
                                        size="small"
                                        placeholder="0"
                                        className="min-w-[70px]"
                                      />
                                    </Form.Control>
                                  </Form.Item>
                                )}
                              />
                            </td>
                            {priceColumns.map((col) => (
                              <td key={"p-" + col.key} className="px-3 py-2">
                                <Form.Field
                                  control={form.control}
                                  name={`variants.${idx}.prices.${col.key}` as any}
                                  render={({ field }) => (
                                    <Form.Item>
                                      <Form.Control>
                                        <Input
                                          {...field}
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          size="small"
                                          placeholder="0.00"
                                          className="min-w-[90px]"
                                        />
                                      </Form.Control>
                                    </Form.Item>
                                  )}
                                />
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {visibleVariants.length === 0 && !showInvalidOptionsMessage && (
            <Alert>{t("products.create.variants.productVariants.alert")}</Alert>
          )}
        </>
      ) : (
        /* Single product: price and stock */
        <div className="flex flex-col gap-y-4">
          <div className="bg-ui-bg-subtle border rounded-xl overflow-hidden">
            <div className="bg-ui-bg-component border-b px-4 py-2">
              <Text size="small" weight="plus">
                {t("fields.priceAndStock", "Fiyat & Stok")}
              </Text>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Form.Field
                control={form.control}
                name="variants.0.sku"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional size="small">
                      SKU
                    </Form.Label>
                    <Form.Control>
                      <Input {...field} size="small" placeholder="ABC-001" />
                    </Form.Control>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="variants.0.barcode"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional size="small">
                      Barkod
                    </Form.Label>
                    <Form.Control>
                      <Input {...field} size="small" placeholder="1234567890" />
                    </Form.Control>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="variants.0.initial_stock"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label size="small">
                      {t("fields.totalStock", "Stok")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        size="small"
                        placeholder="0"
                      />
                    </Form.Control>
                  </Form.Item>
                )}
              />
              {priceColumns.map((col) => (
                <Form.Field
                  key={col.key}
                  control={form.control}
                  name={`variants.0.prices.${col.key}` as any}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label size="small">
                        {t("fields.price", "Satis Fiyati")} ({col.label})
                      </Form.Label>
                      <Form.Control>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step="0.01"
                          size="small"
                          placeholder="0.00"
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}