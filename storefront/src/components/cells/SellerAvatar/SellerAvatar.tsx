import Image from "next/image"

export const SellerAvatar = ({
  photo = "",
  size = 32,
  alt = "",
}: {
  photo?: string
  size?: number
  alt?: string
}) => {
  return photo ? (
    <Image
      src={decodeURIComponent(photo)}
      alt={alt}
      width={size}
      height={size}
      className="object-cover w-full h-full"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      role="img"
      aria-label={alt}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundImage: "url('/images/vendor/default-seller-avatar.png')",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
    />
  )
}
