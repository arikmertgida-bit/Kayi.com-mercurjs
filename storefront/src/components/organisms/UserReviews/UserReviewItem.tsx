"use client"
import Image from "next/image"
import Link from "next/link"
import { ProductReviewCard } from "@/components/organisms/ProductReviews/ProductReviewCard"
import type { Review } from "@/lib/data/reviews"

type ProductSummary = {
  id: string
  title: string
  thumbnail: string | null
  handle: string | null
}

interface Props {
  review: Review
  product: ProductSummary | null
  currentCustomerId: string
}

export const UserReviewItem = ({ review, product, currentCustomerId }: Props) => {
  const productTitle = product?.title ?? "—"
  const productHref = product?.handle ? `/products/${product.handle}` : null

  const productImage = product?.thumbnail ? (
    <Image
      src={decodeURIComponent(product.thumbnail)}
      alt={productTitle}
      width={64}
      height={64}
      className="object-cover w-full h-full"
    />
  ) : (
    <Image
      src="/images/placeholder.svg"
      alt={productTitle}
      width={64}
      height={64}
      className="object-cover w-full h-full"
    />
  )

  return (
    <div className="flex gap-4 items-start">
      {/* LEFT: Product card */}
      <div className="w-24 shrink-0">
        {productHref ? (
          <Link
            href={productHref}
            className="flex flex-col items-center gap-1.5 p-2 rounded-sm border bg-white hover:bg-gray-50 transition-colors h-full"
          >
            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {productImage}
            </div>
            <p className="text-xs font-medium text-center text-primary leading-tight line-clamp-2 w-full hover:underline">
              {productTitle}
            </p>
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-sm border bg-white h-full">
            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {productImage}
            </div>
            <p className="text-xs font-medium text-center text-primary leading-tight line-clamp-2 w-full">
              {productTitle}
            </p>
          </div>
        )}
      </div>

      {/* RIGHT: Full review card — exactly as on product page */}
      <div className="flex-1 min-w-0">
        <ProductReviewCard review={review} currentCustomerId={currentCustomerId} />
      </div>
    </div>
  )
}

