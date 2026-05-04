import { getReviews } from "@/lib/data/reviews"
import type { Review } from "@/lib/data/reviews"
import { retrieveCustomer } from "@/lib/data/customer"
import { batchGetProducts } from "@/lib/data/products"
import { UserReviewItem } from "./UserReviewItem"

export const UserReviewsList = async () => {
  const [user, reviewsRes] = await Promise.all([
    retrieveCustomer(),
    getReviews(),
  ])

  const reviews: Review[] = ((reviewsRes?.data?.reviews ?? []) as Review[])
    .filter((r: Review) => r && r.reference === "product")
    .sort((a: Review, b: Review) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  if (!reviews.length) {
    return (
      <p className="text-sm text-secondary mt-4">
        Henüz değerlendirme yazmadınız.
      </p>
    )
  }

  // Deduplicate product IDs — single batch fetch, no N+1
  const productIds: string[] = [
    ...new Set(reviews.map((r: Review) => r.reference_id).filter((id): id is string => Boolean(id))),
  ]
  const products = await batchGetProducts(productIds)
  const productMap = new Map(products.map((p) => [p.id, p]))

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review: Review) => (
        <UserReviewItem
          key={review.id}
          review={review}
          product={productMap.get(review.reference_id) ?? null}
          currentCustomerId={user?.id ?? ""}
        />
      ))}
    </div>
  )
}
