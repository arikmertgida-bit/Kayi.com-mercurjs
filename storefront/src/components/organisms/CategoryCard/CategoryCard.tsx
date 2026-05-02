"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import Image from "next/image"
import { useState } from "react"

// Deterministik renk — kategori adının char koduna göre seçilir, her render'da aynı
const GRADIENTS = [
  "from-rose-400 to-pink-600",
  "from-orange-400 to-amber-500",
  "from-yellow-400 to-orange-500",
  "from-green-400 to-emerald-600",
  "from-teal-400 to-cyan-600",
  "from-sky-400 to-blue-600",
  "from-indigo-400 to-violet-600",
  "from-purple-400 to-fuchsia-600",
  "from-pink-400 to-rose-600",
  "from-lime-400 to-green-600",
]

function gradientForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % GRADIENTS.length
  return GRADIENTS[hash]
}

export function CategoryCard({
  category,
}: {
  category: { name: string; handle: string; thumbnail?: string | null }
}) {
  const [imgError, setImgError] = useState(false)
  const hasThumbnail = !!category.thumbnail && !imgError
  const gradient = gradientForName(category.name)
  const initial = category.name.charAt(0).toUpperCase()

  return (
    <LocalizedClientLink
      href={`/categories/${category.handle}`}
      className="flex flex-col items-center gap-2 group"
    >
      {/* Yuvarlak container — explicit boyutlar CLS sıfır */}
      <div
        className={`
          relative
          w-20 h-20
          sm:w-24 sm:h-24
          md:w-28 md:h-28
          lg:w-32 lg:h-32
          rounded-full overflow-hidden flex-shrink-0
          ring-2 ring-transparent
          group-hover:ring-[#e30a17]
          transition-all duration-200
        `}
      >
        {hasThumbnail ? (
          <Image
            loading="lazy"
            src={category.thumbnail!}
            alt={`${category.name} kategorisi`}
            fill
            sizes="(min-width: 1024px) 128px, (min-width: 768px) 112px, (min-width: 640px) 96px, 80px"
            className="object-cover object-center"
            quality={85}
            onError={() => setImgError(true)}
          />
        ) : (
          /* Thumbnail yok veya yüklenemedi — gradient + baş harf */
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white font-bold text-xl sm:text-2xl lg:text-3xl select-none drop-shadow-sm">
              {initial}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-center text-xs sm:text-sm font-medium text-primary leading-tight line-clamp-2 px-1">
        {category.name}
      </h3>
    </LocalizedClientLink>
  )
}
