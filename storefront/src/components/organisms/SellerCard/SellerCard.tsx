import Image from "next/image"
import Link from "next/link"

interface SellerCardProps {
  id: string
  name: string
  handle: string
  photo?: string
  locale?: string
}

export function SellerCard({ name, handle, photo, locale = "tr" }: SellerCardProps) {
  return (
    <Link
      href={`/${locale}/sellers/${handle}`}
      className="group border rounded-sm flex flex-col items-center p-3 hover:shadow-md transition-shadow w-full"
    >
      <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-gray-100 mb-3">
        {photo ? (
          <Image
            src={decodeURIComponent(photo)}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {name?.charAt(0)?.toUpperCase() || "M"}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-center text-primary line-clamp-2">
        {name}
      </h3>
    </Link>
  )
}
