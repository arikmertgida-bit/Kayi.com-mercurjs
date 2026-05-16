import { HttpTypes } from "@medusajs/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { useProducts } from "../../../../../hooks/api/products"

type PromotionRule = {
  attribute?: string
  values?: { value?: string }[]
}

type PromotionWithDetails = HttpTypes.AdminPromotion & {
  application_method?: HttpTypes.AdminPromotion["application_method"] & {
    value?: number | null
    target_rules?: PromotionRule[]
  }
}

type CampaignWithDetails = HttpTypes.AdminCampaign & {
  promotions?: PromotionWithDetails[]
}

type Props = {
  campaign: CampaignWithDetails
}

export const CampaignProductsSection = ({ campaign }: Props) => {
  const promotion = campaign.promotions?.[0]
  const discountValue = promotion?.application_method?.value

  const productIdRule = promotion?.application_method?.target_rules?.find(
    (r) => r.attribute === "items.product.id"
  )
  const productIds = productIdRule?.values
    ?.map((v) => v.value)
    .filter((v): v is string => typeof v === "string") ?? []

  const { products, isPending: isLoading } = useProducts(
    { id: productIds } as HttpTypes.AdminProductListParams,
    { enabled: productIds.length > 0 }
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Kampanya Ürünleri</Heading>
        {discountValue != null && (
          <span className="text-ui-fg-subtle txt-small bg-ui-bg-subtle rounded-md px-2 py-1">
            %{discountValue} İndirim
          </span>
        )}
      </div>

      {isLoading && (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted" size="small">
            Yükleniyor...
          </Text>
        </div>
      )}

      {!isLoading && productIds.length === 0 && (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted" size="small">
            Bu kampanyaya ürün eklenmemiş.
          </Text>
        </div>
      )}

      {!isLoading &&
        products?.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between px-6 py-3"
          >
            <Text size="small">{product.title}</Text>
            <Link
              to={`/products/${product.id}`}
              className="text-ui-fg-interactive txt-small hover:underline"
            >
              Detay →
            </Link>
          </div>
        ))}
    </Container>
  )
}
