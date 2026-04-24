import Image from "next/image"
import Link from "next/link"

interface SellerCardProps {
  id: string
  name: string
  handle: string
  memberPhoto?: string
  locale?: string
}

export function SellerCard({ name, handle, memberPhoto, locale = "tr" }: SellerCardProps) {
  const imageSrc = memberPhoto
    ? decodeURIComponent(memberPhoto)
    : "/images/vendor/default-seller-avatar.png"

  return (
    <div className="relative group border rounded-sm flex flex-col justify-between p-1 w-full">
      <div className="relative w-full bg-primary aspect-square">
        <Link
          href={`/${locale}/sellers/${handle}`}
          aria-label={`${name} mağazasını görüntüle`}
        >
          <div className="overflow-hidden rounded-sm w-full h-full flex justify-center items-center">
            <Image
              src={imageSrc}
              alt={`${name} profil fotoğrafı`}
              width={100}
              height={100}
              sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover aspect-square w-full object-center h-full lg:group-hover:-mt-14 transition-all duration-300 rounded-xs"
            />
          </div>
          <span className="absolute rounded-sm bg-action text-action-on-primary h-auto lg:h-[48px] lg:group-hover:block hidden w-full uppercase bottom-1 z-10 flex items-center justify-center text-sm font-medium px-2 truncate leading-[48px] text-center">
            {name}
          </span>
        </Link>
      </div>
      <Link
        href={`/${locale}/sellers/${handle}`}
        aria-label={`${name} mağaza sayfasına git`}
      >
        <div className="flex justify-between p-4">
          <div className="w-full">
            <h3 className="heading-sm truncate">{name}</h3>
          </div>
        </div>
      </Link>
    </div>
  )
}

