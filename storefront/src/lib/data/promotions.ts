"use server"

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export interface PromotionCampaign {
  name: string
  starts_at: string | null
  ends_at: string | null
  budget_remaining_pct: number | null
}

export interface ProductPromotion {
  id: string
  display_code: string
  type: string
  status: string
  is_automatic: boolean
  discount_type: "percentage" | "fixed" | string | null
  discount_value: number
  scope: "seller" | "platform" | string
  campaign: PromotionCampaign | null
}

export interface ProductPromotionsResponse {
  promotions: ProductPromotion[]
}

export async function getProductPromotions(
  productId: string
): Promise<ProductPromotionsResponse> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/products/${encodeURIComponent(productId)}/promotions`,
      {
        next: { revalidate: 60 },
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
            ? {
                "x-publishable-api-key":
                  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
              }
            : {}),
        },
      }
    )

    if (!res.ok) {
      return { promotions: [] }
    }

    const data = (await res.json()) as ProductPromotionsResponse
    return { promotions: data.promotions ?? [] }
  } catch {
    return { promotions: [] }
  }
}
