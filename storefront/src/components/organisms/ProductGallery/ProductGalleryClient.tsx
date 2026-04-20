"use client"

import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { GalleryCarousel } from "@/components/organisms"
import { useProductVariants } from "@/hooks/useProductVariants"

export const ProductGalleryClient = ({
  images,
}: {
  images: HttpTypes.StoreProduct["images"]
}) => {
  const { colorGalleryImages, selectedColor } = useProductVariants()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayImages, setDisplayImages] = useState(
    colorGalleryImages.length > 0 ? colorGalleryImages : images ?? []
  )

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => {
      setDisplayImages(
        colorGalleryImages.length > 0 ? colorGalleryImages : images ?? []
      )
      setIsTransitioning(false)
    }, 150)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor])

  return (
    <div className="relative">
      {isTransitioning && (
        <div className="absolute inset-0 z-10 rounded-sm bg-component animate-pulse" />
      )}
      <GalleryCarousel images={displayImages} />
    </div>
  )
}
