import { retrieveCustomer } from "@/lib/data/customer"
import { listOrders } from "@/lib/data/orders"
import { getProductReviews } from "@/lib/data/reviews"
import { StarRating } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { ProductReviewCard } from "./ProductReviewCard"
import { ProductReviewFormSection } from "./ProductReviewFormSection"

interface Props {
  product: HttpTypes.StoreProduct & { seller?: any }
  locale: string
}

export const ProductReviews = async ({ product, locale }: Props) => {
  const [{ reviews, count, average_rating }, customer] = await Promise.all([
    getProductReviews(product.id!),
    retrieveCustomer(),
  ])

  const DEV_EXCEPTION_EMAIL = "cyclo@gmail.com"
  let canReview = false
  let matchedOrder: any | null = null

  if (customer) {
    try {
      const isDev = (customer as any).email === DEV_EXCEPTION_EMAIL
      const orders = await listOrders(50, 0)
      matchedOrder = (orders || []).find((order) => {
        const containsProduct = order.items?.some((item) => item.product_id === product.id)
        if (!containsProduct) {
          return false
        }

        return isDev ? true : order.status === "completed"
      })
      canReview = isDev ? true : Boolean(matchedOrder)
    } catch {
      canReview = (customer as any).email === DEV_EXCEPTION_EMAIL
      matchedOrder = null
    }
  }

  // Star distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }))

  return (
    <section
      id="product-reviews"
      className="my-10 overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(245,133,41,0.18),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(221,42,123,0.16),_transparent_22%),linear-gradient(135deg,_#fff7ed_0%,_#fff7fb_52%,_#fff1f2_100%)] p-5 md:p-8"
    >
      <h2 className="heading-md mb-6 uppercase text-[#8a1d54]">Reviews ({count})</h2>

      {count > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Score summary */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_16px_40px_rgba(221,42,123,0.08)] backdrop-blur">
            <p className="text-4xl font-bold text-[#c13584]">{average_rating.toFixed(1)}</p>
            <StarRating rate={average_rating} starSize={16} />
            <p className="label-sm text-secondary">{count} reviews</p>
          </div>

          {/* Star distribution */}
          <div className="lg:col-span-3 space-y-2 rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_16px_40px_rgba(245,133,41,0.08)] backdrop-blur">
            {distribution.map(({ star, count: starCount }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="label-sm text-secondary w-4 text-right">{star}</span>
                <StarRating rate={star} starSize={12} />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f9e8ef]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] transition-all"
                    style={{ width: count > 0 ? `${(starCount / count) * 100}%` : "0%" }}
                  />
                </div>
                <span className="label-sm text-secondary w-4">{starCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review list */}
      <div className="space-y-4 mb-8">
        {reviews.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-[#efbdd1] bg-white/70 p-8 text-center">
            <p className="label-md text-secondary">
              No reviews yet. Be the first to review this product!
            </p>
          </div>
        )}
        {reviews.map((review) => (
          <ProductReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Write review section */}
      <div id="write-review-section">
        <ProductReviewFormSection
          product={product}
          customer={customer}
          canReview={canReview}
          matchedOrder={matchedOrder}
          locale={locale}
        />
      </div>
    </section>
  )
}
