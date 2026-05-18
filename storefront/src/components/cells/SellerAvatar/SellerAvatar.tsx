import Image from "next/image"
import { DEFAULT_SELLER_AVATAR } from "@/lib/utils/get-vendor-image"

// KESİNLİKLE DEĞİŞTİRME: Storefront genelinde avatar/profil görseli mantığı bu kalıba bağlıdır.
// Satıcı banner görseli (seller.photo) sadece /seller/[handle] sayfasında kullanılır.
// Fallback: /images/vendor/default-seller-avatar.png — photo boşsa veya null ise bu görünür.
export const SellerAvatar = ({
  photo = "",
  size = 32,
  alt = "",
}: {
  photo?: string
  size?: number
  alt?: string
}) => {
  const src = photo || DEFAULT_SELLER_AVATAR

  return (
    <Image
      src={decodeURIComponent(src)}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover aspect-square flex-shrink-0"
      style={{ width: size, height: size }}
      sizes={`${size}px`}
    />
  )
}
