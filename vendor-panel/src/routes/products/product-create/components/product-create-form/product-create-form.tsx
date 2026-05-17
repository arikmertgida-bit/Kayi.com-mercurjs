import { Button, Heading, ProgressStatus, ProgressTabs, Text, toast } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { startTransition, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  useDashboardExtension,
  useExtendableForm,
} from "../../../../../extensions"
import { useCreateProduct } from "../../../../../hooks/api/products"
import { useBatchInventoryItemsLocationLevels } from "../../../../../hooks/api/inventory"
import { useStockLocations, useCreateStockLocation } from "../../../../../hooks/api/stock-locations"
import { useRegions } from "../../../../../hooks/api/regions"
import { uploadFilesQuery, fetchQuery } from "../../../../../lib/client"
import {
  PRODUCT_CREATE_FORM_DEFAULTS,
  ProductCreateSchema,
} from "../../constants"
import { decorateVariantsWithDefaultValues } from "../../utils"
import { ProductCreateDetailsForm } from "../product-create-details-form"
import { ProductCreateVariantsForm } from "../product-create-variants-form"
import { ProductCreateReviewForm } from "../product-create-review-form/product-create-review-form"
import { ProductCreateAttributesForm } from "../product-create-attributes-form/product-create-attributes-form"

type ProductType = "single" | "variant"

enum Tab {
  DETAILS = "details",
  VARIANTS = "variants",
  ATTRIBUTES = "attributes",
  REVIEW = "review",
}

type TabState = Record<Tab, ProgressStatus>

const SAVE_DRAFT_BUTTON = "save-draft-button"

// Her tab yalnızca kendi alanlarını validate eder
const DETAILS_FIELDS = [
  "title", "subtitle", "handle", "description", "discountable",
  "type_id", "collection_id", "shipping_profile_id", "categories", "tags",
  "origin_country", "material", "width", "length", "height", "weight",
  "mid_code", "hs_code", "media",
] as const

const VARIANT_FIELDS = [
  "enable_variants", "options", "variants",
] as const

const ATTRIBUTE_FIELDS = [
  "attribute_values",
] as const

const TAB_ORDER: Tab[] = [Tab.DETAILS, Tab.VARIANTS, Tab.ATTRIBUTES, Tab.REVIEW]

type ProductCreateFormProps = {
  defaultChannel?: HttpTypes.AdminSalesChannel
  store?: HttpTypes.AdminStore
  pricePreferences?: HttpTypes.AdminPricePreference[]
  initialProductType?: ProductType
}

export const ProductCreateForm = ({
  defaultChannel,
  store,
  initialProductType,
}: ProductCreateFormProps) => {
  const [typeSelected, setTypeSelected] = useState<ProductType | null>(initialProductType ?? null)
  const [tab, setTab] = useState<Tab>(Tab.DETAILS)
  const tabState = useMemo<TabState>(() => {
    const idx = TAB_ORDER.indexOf(tab)
    return {
      [Tab.DETAILS]: idx > 0 ? "completed" : "in-progress",
      [Tab.VARIANTS]: idx > 1 ? "completed" : idx === 1 ? "in-progress" : "not-started",
      [Tab.ATTRIBUTES]: idx > 2 ? "completed" : idx === 2 ? "in-progress" : "not-started",
      [Tab.REVIEW]: idx === 3 ? "in-progress" : "not-started",
    }
  }, [tab])

  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { getFormConfigs } = useDashboardExtension()
  const configs = getFormConfigs("product", "create")

  const form = useExtendableForm({
    defaultValues: {
      ...PRODUCT_CREATE_FORM_DEFAULTS,
      sales_channels: defaultChannel
        ? [
            {
              id: defaultChannel.id,
              name: defaultChannel.name,
            },
          ]
        : [],
    },
    schema: ProductCreateSchema,
    configs,
  })

  const { mutateAsync, isPending } = useCreateProduct()
  const { mutateAsync: batchUpdateStock } = useBatchInventoryItemsLocationLevels()
  const { mutateAsync: createStockLocation } = useCreateStockLocation()
  const { stock_locations } = useStockLocations({ limit: 9999 })
  const { regions } = useRegions({ limit: 9999 })

  const handleTypeSelect = (type: ProductType) => {
    startTransition(() => {
      form.setValue("enable_variants", type === "variant")
      if (type === "single") {
        form.setValue("options", [{ title: "Varsayılan Seçenek", values: ["Varsayılan Değer"] }])
        form.setValue(
          "variants",
          decorateVariantsWithDefaultValues([
            {
              title: "Varsayılan Varyant",
              should_create: true,
              variant_rank: 0,
              options: { "Varsayılan Seçenek": "Varsayılan Değer" },
              inventory: [{ inventory_item_id: "", required_quantity: "" }],
              is_default: true,
            },
          ])
        )
      } else {
        form.setValue("options", [
          { title: "Renk", values: [] },
          { title: "Beden", values: [] },
          { title: "Numara", values: [] },
        ])
        form.setValue("variants", [])
      }
      setTypeSelected(type)
    })
  }

  // initialProductType ile doğrudan açılan formlarda seçici ekranı atlanır,
  // form değerleri mount anında set edilir.
  useEffect(() => {
    if (!initialProductType) return
    if (initialProductType === "single") {
      form.setValue("enable_variants", false)
      form.setValue("options", [{ title: "Varsayılan Seçenek", values: ["Varsayılan Değer"] }])
      form.setValue(
        "variants",
        decorateVariantsWithDefaultValues([
          {
            title: "Varsayılan Varyant",
            should_create: true,
            variant_rank: 0,
            options: { "Varsayılan Seçenek": "Varsayılan Değer" },
            inventory: [{ inventory_item_id: "", required_quantity: "" }],
            is_default: true,
          },
        ])
      )
    } else {
      form.setValue("enable_variants", true)
      form.setValue("options", [
        { title: "Renk", values: [] },
        { title: "Beden", values: [] },
        { title: "Numara", values: [] },
      ])
      form.setValue("variants", [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = form.handleSubmit(async (values, e) => {
    let isDraftSubmission = false

    if (e?.nativeEvent instanceof SubmitEvent) {
      const submitter = e?.nativeEvent?.submitter as HTMLButtonElement
      isDraftSubmission = submitter.dataset.name === SAVE_DRAFT_BUTTON
    }

    const media = values.media || []
    const payload = { ...values, media: undefined, attribute_values: values.attribute_values }

    let uploadedMedia: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    try {
      if (media.length) {
        const thumbnailReq = media.filter((m) => m.isThumbnail)
        const otherMediaReq = media.filter((m) => !m.isThumbnail)

        const fileReqs = []
        if (thumbnailReq?.length) {
          fileReqs.push(
            uploadFilesQuery(thumbnailReq).then((r) =>
              r.files.map((f) => ({
                ...f,
                isThumbnail: true,
              }))
            )
          )
        }
        if (otherMediaReq?.length) {
          fileReqs.push(
            uploadFilesQuery(otherMediaReq).then((r) =>
              r.files.map((f) => ({
                ...f,
                isThumbnail: false,
              }))
            )
          )
        }

        uploadedMedia = (await Promise.all(fileReqs)).flat()
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
      // Görsel yükleme başarısız olursa işlemi durdur
      return
    }

    // Upload variant thumbnail files
    // variant_thumbnail_file sadece her renk grubunun ilk varyantında set edilir.
    // Upload sonrası aynı renk değerine sahip tüm varyantlara URL yayılır.
    const variantThumbnailUrls: Record<number, string> = {}
    try {
      const thumbUploads = payload.variants
        .map((v, i) => {
          const vWithFile = v as typeof v & { variant_thumbnail_file?: File }
          return vWithFile.variant_thumbnail_file ? { i, file: vWithFile.variant_thumbnail_file } : null
        })
        .filter((x): x is { i: number; file: File } => x !== null)
      if (thumbUploads.length) {
        await Promise.all(
          thumbUploads.map(async ({ i, file }) => {
            const r = await uploadFilesQuery([{ file }])
            const url = r.files[0]?.url
            if (url) variantThumbnailUrls[i] = url
          })
        )
        // Aynı renk grubundaki diğer varyantlara URL'i yay
        payload.variants.forEach((v, i) => {
          if (variantThumbnailUrls[i] !== undefined) return
          const colorKey = Object.keys(v.options || {}).find((k) =>
            ["renk", "color"].includes(k.toLowerCase())
          )
          if (!colorKey) return
          const colorVal = (v.options as Record<string, string>)[colorKey]
          const match = payload.variants.findIndex((other, j) => {
            if (variantThumbnailUrls[j] === undefined) return false
            const otherColorKey = Object.keys(other.options || {}).find((k) =>
              ["renk", "color"].includes(k.toLowerCase())
            )
            return otherColorKey && (other.options as Record<string, string>)[otherColorKey] === colorVal
          })
          if (match >= 0) variantThumbnailUrls[i] = variantThumbnailUrls[match]
        })
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    await mutateAsync(
      {
        ...payload,
        attribute_values: undefined,
        status: isDraftSubmission ? "draft" : "proposed",
        thumbnail: uploadedMedia.find((m) => m.isThumbnail)?.url,
        images: uploadedMedia
          .filter((m) => !m.isThumbnail)
          .map((m) => ({ url: m.url })),
        weight: parseInt(payload.weight || "") || undefined,
        length: parseInt(payload.length || "") || undefined,
        height: parseInt(payload.height || "") || undefined,
        width: parseInt(payload.width || "") || undefined,
        origin_country: payload.origin_country || undefined,
        material: payload.material || undefined,
        hs_code: undefined,
        mid_code: undefined,
        type_id: payload.type_id || undefined,
        tags:
          payload.tags?.map((tag) => ({
            id: tag,
          })) || [],
        collection_id: payload.collection_id || undefined,
        shipping_profile_id: undefined,
        enable_variants: undefined,
        additional_data: (() => {
          const avEntries = Object.entries(payload.attribute_values || {}).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined
          )
          if (avEntries.length === 0) return undefined
          return {
            values: avEntries.map(([attribute_id, value]) => ({ attribute_id, value })),
          }
        })(),
        metadata: {
          product_type: (typeSelected ?? initialProductType) === "variant" ? "variant" : "single",
        },
        categories: payload.categories.map((cat) => ({
          id: cat,
        })),
        variants: payload.variants.map((variant, variantIdx) => ({
          ...variant,
          sku: variant.sku === "" ? undefined : variant.sku,
          manage_inventory: true,
          allow_backorder: false,
          should_create: undefined,
          is_default: undefined,
          inventory_kit: undefined,
          inventory: undefined,
          initial_stock: undefined,
          compare_at_prices: undefined,
          variant_thumbnail_file: undefined,
          metadata: variantThumbnailUrls[variantIdx]
            ? { thumbnail_url: variantThumbnailUrls[variantIdx] }
            : undefined,
          prices: Object.keys(variant.prices || {}).flatMap((key) => {
            const raw = variant.prices?.[key]
            if (raw === undefined || raw === null || raw === "") return []
            const amount = parseFloat(raw as string)
            if (isNaN(amount)) return []
            if (key.startsWith("reg_")) {
              const region = (regions ?? []).find((r) => r.id === key)
              if (!region) return []
              return [{ currency_code: region.currency_code, amount, rules: { region_id: key } }]
            }
            return [{ currency_code: key, amount }]
          }),
        })),
        options: payload.options.filter((o) => o.title && o.values.length > 0),
      },
      {
        onSuccess: async (data) => {
          // Attribute values varsa ürün oluşturulduktan hemen sonra kaydet
          const attrValues = values.attribute_values
          if (attrValues && Object.keys(attrValues).length > 0) {
            try {
              const filteredValues = Object.entries(attrValues)
                .filter(([, value]) => value !== "" && value !== null && value !== undefined)
                .map(([attribute_id, value]) => ({ attribute_id, value: String(value) }))

              if (filteredValues.length > 0) {
                await fetchQuery(`/vendor/products/${data.product.id}`, {
                  method: "POST",
                  body: { additional_data: { values: filteredValues } },
                })
              }
            } catch (e) {
              console.error("Failed to save attribute values:", e)
            }
          }

          // Set initial stock for variants that have it
          const variantsWithStock = values.variants
            .map((v: any, i: number) => ({ index: i, stock: Number(v.initial_stock) || 0 }))
            .filter(({ stock }) => stock > 0)

          if (variantsWithStock.length > 0) {
            try {
              // Satıcının hiç lokasyonu yoksa otomatik oluştur
              let locationsToUse: { id: string }[] = stock_locations ?? []
              if (locationsToUse.length === 0) {
                const newLocResult: any = await createStockLocation({ name: "Varsayılan Depo" })
                const newLoc = newLocResult?.stock_location
                if (newLoc) locationsToUse = [newLoc]
              }

              if (locationsToUse.length > 0) {
                // /vendor/products/:id route'u olmadığı için inventory-items üzerinden SKU eşleşmesi
                const invData: any = await fetchQuery("/vendor/inventory-items", {
                  method: "GET",
                  query: { limit: 500, fields: "id,sku" },
                })
                const allInventoryItems: any[] = invData?.inventory_items ?? []

                // SKU → inventory_item_id haritası
                const skuToInvId = new Map<string, string>()
                for (const item of allInventoryItems) {
                  if (item.sku && item.id) skuToInvId.set(item.sku, item.id)
                }

                const createLevels: any[] = []

                for (const { index, stock } of variantsWithStock) {
                  const formVariant = values.variants[index] as typeof values.variants[number] & { sku?: string }
                  const inventoryItemId = formVariant.sku
                    ? skuToInvId.get(formVariant.sku)
                    : undefined
                  if (!inventoryItemId) continue

                  const locationCount = locationsToUse.length
                  const perLocation = Math.floor(stock / locationCount)
                  const remainder = stock % locationCount

                  for (let i = 0; i < locationsToUse.length; i++) {
                    createLevels.push({
                      inventory_item_id: inventoryItemId,
                      location_id: locationsToUse[i].id,
                      stocked_quantity: perLocation + (i === 0 ? remainder : 0),
                    })
                  }
                }

                if (createLevels.length > 0) {
                  await batchUpdateStock({ create: createLevels } as any)
                }
              }
            } catch (e) {
              console.error("Failed to set initial stock:", e)
            }
          }

          toast.success(
            t("products.create.successToast", {
              title: data.product.title,
            })
          )

          handleSuccess(`/products/${data.product.id}`)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  const onNext = async (currentTab: Tab) => {
    if (currentTab === Tab.DETAILS) {
      const valid = await form.trigger(DETAILS_FIELDS as any)
      if (valid) setTab(Tab.VARIANTS)
      return
    }
    if (currentTab === Tab.VARIANTS) {
      const enableVariants = form.getValues("enable_variants")
      const valid = await form.trigger(enableVariants ? (VARIANT_FIELDS as any) : [])
      if (valid) setTab(Tab.ATTRIBUTES)
      return
    }
    if (currentTab === Tab.ATTRIBUTES) {
      const valid = await form.trigger(ATTRIBUTE_FIELDS as any)
      if (valid) setTab(Tab.REVIEW)
      return
    }
  }

  return (
    <RouteFocusModal.Form form={form}>
      {typeSelected === null ? (
        <ProductTypeSelector onSelect={handleTypeSelect} />
      ) : (
      <KeyboundForm
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (
              e.target instanceof HTMLTextAreaElement &&
              !(e.metaKey || e.ctrlKey)
            ) {
              return
            }

            e.preventDefault()

            if (e.metaKey || e.ctrlKey) {
              if (tab !== Tab.REVIEW) {
                e.preventDefault()
                e.stopPropagation()
                onNext(tab)

                return
              }

              handleSubmit()
            }
          }
        }}
        onSubmit={handleSubmit}
        className="animate-in fade-in duration-150 flex h-full flex-col"
      >
        <ProgressTabs
          value={tab}
          onValueChange={async (nextTab) => {
            const currentIndex = TAB_ORDER.indexOf(tab)
            const targetIndex = TAB_ORDER.indexOf(nextTab as Tab)
            // Backward navigation requires no validation
            if (targetIndex > currentIndex) {
              const valid = await form.trigger()
              if (!valid) return
            }
            setTab(nextTab as Tab)
          }}
          className="flex h-full flex-col overflow-hidden"
        >
          <RouteFocusModal.Header>
            <div className="-my-2 w-full border-l">
              <ProgressTabs.List className="justify-start-start flex w-full items-center">
                <ProgressTabs.Trigger
                  status={tabState[Tab.DETAILS]}
                  value={Tab.DETAILS}
                  className="max-w-[200px] truncate"
                >
                  {t("products.create.tabs.details")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  status={tabState[Tab.VARIANTS]}
                  value={Tab.VARIANTS}
                  className="max-w-[200px] truncate"
                >
                  {initialProductType === "single"
                    ? t("products.create.tabs.priceAndStock", "Fiyat & Stok")
                    : t("products.create.tabs.variants")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  status={tabState[Tab.ATTRIBUTES]}
                  value={Tab.ATTRIBUTES}
                  className="max-w-[200px] truncate"
                >
                  {t("products.create.tabs.attributes", "Özellikler")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  status={tabState[Tab.REVIEW]}
                  value={Tab.REVIEW}
                  className="max-w-[200px] truncate"
                >
                  {t("products.create.tabs.review", "Özet")}
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </div>
          </RouteFocusModal.Header>
          <RouteFocusModal.Body className="size-full overflow-hidden">
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={Tab.DETAILS}
            >
              <ProductCreateDetailsForm form={form} />
            </ProgressTabs.Content>
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={Tab.VARIANTS}
            >
              <ProductCreateVariantsForm
                form={form}
                store={store}
              />
            </ProgressTabs.Content>
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={Tab.ATTRIBUTES}
            >
              <ProductCreateAttributesForm form={form} />
            </ProgressTabs.Content>
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={Tab.REVIEW}
            >
              <ProductCreateReviewForm form={form} />
            </ProgressTabs.Content>
          </RouteFocusModal.Body>
        </ProgressTabs>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              data-name={SAVE_DRAFT_BUTTON}
              size="small"
              type="submit"
              isLoading={isPending}
              className="whitespace-nowrap"
            >
              {t("actions.saveAsDraft", "Taslak Kaydet")}
            </Button>
            <PrimaryButton
              tab={tab}
              next={onNext}
              isLoading={isPending}
            />
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
      )}
    </RouteFocusModal.Form>
  )
}

type ProductTypeSelectorProps = {
  onSelect: (type: ProductType) => void
}

const ProductTypeSelector = ({ onSelect }: ProductTypeSelectorProps) => {
  const { t } = useTranslation()

  return (
    <>
      <RouteFocusModal.Header>
        <div className="-my-2 w-full border-l px-6 py-3">
          <span className="txt-compact-medium-plus text-ui-fg-base">
            {t("products.create.typeSelect.heading", "Ürün Oluştur")}
          </span>
        </div>
      </RouteFocusModal.Header>

      <RouteFocusModal.Body className="flex items-center justify-center p-8 overflow-y-auto">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 flex w-full max-w-2xl flex-col items-center gap-y-10">
          <div className="flex flex-col items-center gap-y-2 text-center">
            <Heading>
              {t("products.create.typeSelect.title", "Nasıl bir ürün ekleyeceksiniz?")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle max-w-md">
              {t(
                "products.create.typeSelect.subtitle",
                "Ürün türünü seçerek devam edin. Tekil ürün tek bir çeşide sahipken, varyasyonlu ürün farklı renk veya beden seçenekleri sunar."
              )}
            </Text>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelect("single")}
              className="group flex flex-col gap-y-5 rounded-xl border-2 border-ui-border-base bg-ui-bg-base p-6 text-left transition-all hover:border-ui-border-interactive hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ui-bg-component text-2xl group-hover:bg-ui-bg-subtle">
                🏷️
              </div>
              <div className="flex flex-col gap-y-2">
                <Text weight="plus" size="base">
                  {t("products.create.typeSelect.single.label", "Tekil Ürün")}
                </Text>
                <Text size="small" className="text-ui-fg-subtle leading-relaxed">
                  {t(
                    "products.create.typeSelect.single.desc",
                    "Tek bir renk ve bedenden oluşan ürün. Kendine ait Model Kodu ve Barkodu bulunur."
                  )}
                </Text>
              </div>
              <div className="mt-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ui-bg-subtle px-3 py-1 text-xs text-ui-fg-subtle">
                  SKU · Barkod · Fiyat · Stok
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelect("variant")}
              className="group flex flex-col gap-y-5 rounded-xl border-2 border-ui-border-base bg-ui-bg-base p-6 text-left transition-all hover:border-ui-border-interactive hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ui-bg-component text-2xl group-hover:bg-ui-bg-subtle">
                🎨
              </div>
              <div className="flex flex-col gap-y-2">
                <Text weight="plus" size="base">
                  {t("products.create.typeSelect.variant.label", "Varyasyonlu Ürün")}
                </Text>
                <Text size="small" className="text-ui-fg-subtle leading-relaxed">
                  {t(
                    "products.create.typeSelect.variant.desc",
                    "Aynı modelin farklı renk, beden veya boyut seçenekleri. Tüm seçeneklerin Model Kodu aynı, Barkodları farklı olur."
                  )}
                </Text>
              </div>
              <div className="mt-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ui-bg-subtle px-3 py-1 text-xs text-ui-fg-subtle">
                  Model Kodu · Renk / Beden · Her varyant ayrı Barkod
                </span>
              </div>
            </button>
          </div>
        </div>
      </RouteFocusModal.Body>

      <RouteFocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <RouteFocusModal.Close asChild>
            <Button variant="secondary" size="small">
              {t("actions.cancel")}
            </Button>
          </RouteFocusModal.Close>
        </div>
      </RouteFocusModal.Footer>
    </>
  )
}

type PrimaryButtonProps = {
  tab: Tab
  next: (tab: Tab) => void
  isLoading?: boolean
}

const PrimaryButton = ({ tab, next, isLoading }: PrimaryButtonProps) => {
  const { t } = useTranslation()

  if (tab === Tab.REVIEW) {
    return (
      <Button
        data-name="publish-button"
        key="submit-button"
        type="submit"
        variant="primary"
        size="small"
        isLoading={isLoading}
      >
        {t("actions.publish", "Yayınla")}
      </Button>
    )
  }

  return (
    <Button
      key="next-button"
      type="button"
      variant="primary"
      size="small"
      onClick={() => next(tab)}
    >
      {t("actions.continue")}
    </Button>
  )
}
