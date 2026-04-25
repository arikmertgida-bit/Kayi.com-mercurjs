import { StarRating } from "@/components/atoms"
import { SellerAvatar } from "@/components/cells/SellerAvatar/SellerAvatar"
import { SellerProps } from "@/types/seller"

export const SellerInfo = ({
  seller,
}: {
  seller: SellerProps
  header?: boolean
}) => {
  const ownerMember =
    seller.members?.find((m) => m.role === "owner" || m.role === "admin") ??
    seller.members?.[0]

  const memberPhoto = ownerMember?.photo ?? seller.photo
  const { name, reviews } = seller

  const reviewCount = reviews
    ? reviews?.filter((rev) => rev !== null).length
    : 0

  const rating =
    reviews && reviews.length > 0
      ? reviews
          .filter((rev) => rev !== null)
          .reduce((sum, r) => sum + (r?.rating || 0), 0) / reviewCount
      : 0

  return (
    <div className="flex gap-4 w-full">
      <div className="relative h-14 w-14 overflow-hidden rounded-sm">
        <SellerAvatar photo={memberPhoto} size={56} alt={name} />
      </div>
      <div className="w-[90%]">
        <h3 className="heading-sm text-primary">{name}</h3>
        <div className="flex items-center gap-2 pb-4">
          <StarRating starSize={16} rate={rating || 0} />
          <span className="text-md text-secondary">{reviewCount} reviews</span>
        </div>
      </div>
    </div>
  )
}
