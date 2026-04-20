import { Divider, Heading, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useProductCategories } from "../../../../../hooks/api/categories"
import { ProductCreateSchemaType } from "../../types"

type ProductCreateReviewFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateReviewForm = ({ form }: ProductCreateReviewFormProps) => {
  const { t } = useTranslation()

  const title = useWatch({ control: form.control, name: "title" })
  const enableVariants = useWatch({ control: form.control, name: "enable_variants", defaultValue: false })
  const variants = useWatch({ control: form.control, name: "variants", defaultValue: [] })
  const media = useWatch({ control: form.control, name: "media", defaultValue: [] })
  const categories = useWatch({ control: form.control, name: "categories", defaultValue: [] })

  const { product_categories } = useProductCategories(
    { limit: 500 },
    { enabled: categories.length > 0 }
  )

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>()
    if (product_categories) {
      for (const cat of product_categories) {
        map.set(cat.id, cat.name)
      }
    }
    return map
  }, [product_categories])

  const activeVariants = variants.filter((v) => v.should_create)
  const thumbnail = media?.find((m) => m.isThumbnail)
  const variantThumbCount = variants.filter((v) => !!(v as any).variant_thumbnail_file).length
  const totalStock = activeVariants.reduce(
    (sum, v) => sum + (Number(v.initial_stock) || 0),
    0
  )

  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        <div className="flex flex-col gap-y-2">
          <Heading>{t("products.create.review.header", "Gözden Geçir")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t(
              "products.create.review.description",
              "Ürün bilgilerini kontrol edin. Hazırsa yayınlayın ya da taslak olarak kaydedin."
            )}
          </Text>
        </div>

        <Divider />

        {/* Özet kartı */}
        <div className="bg-ui-bg-subtle border rounded-xl overflow-hidden">
          {thumbnail?.url && (
            <div className="flex justify-center bg-ui-bg-component border-b p-4">
              <img
                src={thumbnail.url}
                alt={title}
                className="h-32 w-32 rounded-lg object-cover"
              />
            </div>
          )}
          <div className="p-6 flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-1">
              <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wide">
                {t("fields.title", "Ürün Adı")}
              </Text>
              <Text weight="plus">{title || "-"}</Text>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-y-1">
                <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wide">
                  {t("products.create.review.variantCount", "Varyant Sayısı")}
                </Text>
                <Text weight="plus">
                  {enableVariants ? activeVariants.length : t("general.none", "Yok")}
                </Text>
              </div>

              <div className="flex flex-col gap-y-1">
                <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wide">
                  {t("fields.totalStock", "Toplam Stok")}
                </Text>
                <Text weight="plus">{totalStock}</Text>
              </div>

              <div className="flex flex-col gap-y-1">
                <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wide">
                  {t("products.fields.images.label", "Görsel")}
                </Text>
                <Text weight="plus">{(media?.length ?? 0) + variantThumbCount}</Text>
                {variantThumbCount > 0 && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {media?.length ?? 0} ürün · {variantThumbCount} varyant
                  </Text>
                )}
              </div>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-col gap-y-1">
                <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wide">
                  {t("products.fields.categories.label", "Kategori")}
                </Text>
                <Text>{categories.map((id: string) => categoryNameMap.get(id) ?? id).join(", ")}</Text>
              </div>
            )}
          </div>
        </div>

        <Text size="small" className="text-ui-fg-subtle text-center">
          {t(
            "products.create.review.hint",
            '"Taslak Kaydet" ile sadece siz görebilirsiniz. "Yayınla" ile ürün aktif olur.'
          )}
        </Text>
      </div>
    </div>
  )
}
