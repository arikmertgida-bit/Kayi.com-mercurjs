import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"
import { FollowButton } from "@/components/atoms/FollowButton/FollowButton"

export const SellerPageHeader = ({
  seller,
  user,
  followStatus,
}: {
  header?: boolean
  seller: SellerProps
  user: HttpTypes.StoreCustomer | null
  followStatus: { following: boolean; followers_count: number }
}) => {
  const isActive = seller.store_status === "ACTIVE"

  const ownerMember =
    seller.members?.find((m) => m.role === "owner" || m.role === "admin") ??
    seller.members?.[0]

  const profilePhoto = ownerMember?.photo ?? null
  const profileName = ownerMember?.name ?? null

  const AVATAR = 96

  const filteredReviews = seller.reviews?.filter((r) => r !== null) ?? []
  const reviewCount = filteredReviews.length
  const rating =
    reviewCount > 0
      ? filteredReviews.reduce((sum, r) => sum + (r?.rating || 0), 0) / reviewCount
      : 0
  const ratingDisplay =
    reviewCount > 0 ? `${rating.toFixed(1)} ★ (${reviewCount})` : null

  return (
    <div className="w-full overflow-x-hidden">
      <div
        className="relative w-full overflow-hidden h-28 sm:h-40 md:h-52 lg:h-64 xl:h-[400px] rounded-[8px]"
      >
        <Image
          src={seller.photo ? decodeURIComponent(seller.photo) : "/images/vendor/default-store-banner.jpeg"}
          alt={seller.name}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div
        className="relative flex items-start px-4 md:px-8 -mt-10 md:-mt-12"
      >
        <div className="flex items-start">
          <div
            className="flex-shrink-0 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white z-10 w-20 h-20 md:w-24 md:h-24"
          >
            {profilePhoto ? (
              <Image
                src={decodeURIComponent(profilePhoto)}
                alt={profileName || seller.name}
                width={AVATAR}
                height={AVATAR}
                priority
                className="object-cover w-full h-full"
              />
            ) : (
              <Image
                src="/images/vendor/default-seller-avatar.png"
                alt={profileName || seller.name}
                width={AVATAR}
                height={AVATAR}
                priority
                className="object-cover w-full h-full"
              />
            )}
          </div>

          <div className="w-2.5" />

          <div className="mt-[45px] md:mt-[53px]">
            <span className="text-sm md:text-base font-semibold text-gray-800 leading-tight">
              {profileName || seller.name}
            </span>
          </div>
        </div>

        <div
          className="hidden min-[900px]:block absolute left-1/2 -translate-x-1/2 text-center mt-[45px] md:mt-[53px]"
        >
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-xl md:text-3xl font-black uppercase text-gray-900 leading-tight whitespace-nowrap">
              {seller.name}
            </h1>
            {isActive && (
              <span
                title="Verified"
                className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 bg-blue-500 rounded-full flex items-center justify-center shadow"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-2.5 h-2.5 md:w-3 md:h-3"
                >
                  <path
                    fillRule="evenodd"
                    d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
          {ratingDisplay && (
            <p className="text-sm text-gray-500 mt-1">{ratingDisplay}</p>
          )}
        </div>

        <div
          className="hidden min-[900px]:block flex-shrink-0 ml-auto mt-[45px] md:mt-[53px]"
        >
          <FollowButton
            handle={seller.handle}
            initialFollowing={followStatus.following}
            initialCount={followStatus.followers_count}
            isLoggedIn={Boolean(user)}
          />
        </div>
      </div>

      {/* <900px: Mağaza adı + Takip Et alt satır */}
      <div className="flex min-[900px]:hidden flex-col px-4 mt-3 gap-1">
        {ratingDisplay && (
          <p className="text-sm text-gray-500 text-center w-full">{ratingDisplay}</p>
        )}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black uppercase text-gray-900 leading-tight">
            {seller.name}
          </h1>
          {isActive && (
            <span
              title="Verified"
              className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <FollowButton
          handle={seller.handle}
          initialFollowing={followStatus.following}
          initialCount={followStatus.followers_count}
          isLoggedIn={Boolean(user)}
        />
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}