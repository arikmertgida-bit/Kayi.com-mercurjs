"use client"

import useEmblaCarousel from "embla-carousel-react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { ProductCarouselIndicator } from "@/components/molecules"
import { useScreenSize } from "@/hooks/useScreenSize"
import { SearchIcon } from "@/icons"

export const ProductCarousel = ({
  slides = [],
  onImageClick,
}: {
  slides: HttpTypes.StoreProduct["images"]
  onImageClick?: (index: number) => void
}) => {
  const screenSize = useScreenSize()

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis:
      screenSize === "xs" || screenSize === "sm" || screenSize === "md"
        ? "x"
        : "y",
    loop: true,
    align: "start",
  })

  return (
    <div className="embla relative">
      {/* Magnifier button — tıklanabilir, mevcut slide'dan lightbox açar */}
      {onImageClick && (
        <button
          className="absolute top-3 right-3 z-20 bg-black/50 rounded-full p-1.5 cursor-pointer"
          onClick={() => onImageClick(emblaApi?.selectedScrollSnap() ?? 0)}
          aria-label="Görseli büyüt"
        >
          <SearchIcon size={18} color="#ffffff" />
        </button>
      )}
      <div
        className="embla__viewport overflow-hidden rounded-xs"
        ref={emblaRef}
      >
        <div className="embla__container h-[350px] lg:h-fit max-h-[698px] flex lg:block">
          {(slides || []).map((slide, idx) => (
            <div
              key={slide.id}
              className="embla__slide min-w-0 h-[350px] lg:h-[698px]"
            >
              <div
                className={onImageClick ? "w-full h-full cursor-zoom-in" : "w-full h-full"}
                onClick={onImageClick ? () => onImageClick(idx) : undefined}
              >
                <Image
                  priority={idx === 0}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  src={decodeURIComponent(slide.url)}
                  alt="Product image"
                  width={700}
                  height={700}
                  quality={idx === 0 ? 85 : 70}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          ))}
        </div>
        {slides?.length ? (
          <ProductCarouselIndicator slides={slides} embla={emblaApi} />
        ) : null}
      </div>
    </div>
  )
}
