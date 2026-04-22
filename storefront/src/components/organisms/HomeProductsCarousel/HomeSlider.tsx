"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useEffect, useState } from "react"
import { EmblaCarouselType } from "embla-carousel"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ProductCard } from "../ProductCard/ProductCard"

function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.5303 4.46967C15.8232 4.76256 15.8232 5.23744 15.5303 5.53033L8.81066 12.25L15.5303 18.9697C15.8232 19.2626 15.8232 19.7374 15.5303 20.0303C15.2374 20.3232 14.7626 20.3232 14.4697 20.0303L7.46967 13.0303C7.17678 12.7374 7.17678 12.2626 7.46967 11.9697L14.4697 4.96967C14.7626 4.67678 15.2374 4.67678 15.5303 4.96967Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.46967 4.46967C8.76256 4.17678 9.23744 4.17678 9.53033 4.46967L16.5303 11.4697C16.8232 11.7626 16.8232 12.2374 16.5303 12.5303L9.53033 19.5303C9.23744 19.8232 8.76256 19.8232 8.46967 19.5303C8.17678 19.2374 8.17678 18.7626 8.46967 18.4697L15.1893 11.75L8.46967 5.53033C8.17678 5.23744 8.17678 4.76256 8.46967 4.46967Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const HomeSlider = ({
  heading,
  initialProducts,
  seller_handle,
  allProductsHref,
}: {
  heading: string
  initialProducts: HttpTypes.StoreProduct[]
  seller_handle?: string
  allProductsHref?: string
}) => {
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>(initialProducts)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    dragFree: false,
    containScroll: "trimSnaps",
  })

  const updateScrollState = useCallback((api: EmblaCarouselType) => {
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    updateScrollState(emblaApi)
    emblaApi.on("select", updateScrollState)
    emblaApi.on("reInit", updateScrollState)
    return () => {
      emblaApi.off("select", updateScrollState)
      emblaApi.off("reInit", updateScrollState)
    }
  }, [emblaApi, updateScrollState])

  // Re-init when products array grows (lazy loaded)
  useEffect(() => {
    if (emblaApi) emblaApi.reInit()
  }, [products, emblaApi])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const totalProducts = products.length

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center mb-3">
        <h2 className="heading-md font-bold tracking-tight uppercase">
          {heading}
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative">
        {canScrollPrev && (
          <button
            onClick={scrollPrev}
            aria-label="Previous products"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-[#000000] text-[#fcfcfc] hover:bg-[#e30a17] hover:text-[#fcfcfc] transition-all duration-200 active:scale-95"
          >
            <ChevronLeftIcon />
          </button>
        )}
        {canScrollNext && (
          <button
            onClick={scrollNext}
            aria-label="Next products"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-[#000000] text-[#fcfcfc] hover:bg-[#e30a17] hover:text-[#fcfcfc] transition-all duration-200 active:scale-95"
          >
            <ChevronRightIcon />
          </button>
        )}
        <div className="overflow-hidden -ml-1.5" ref={emblaRef}>
          <div className="flex">
            {products.map((product, index) => (
            <div key={product.id} className="home-slider-slide flex-shrink-0">
              <ProductCard
                product={product}
                api_product={product}
                isEager={index < 2}
                sliderCard
              />
            </div>
          ))}
          {/* "Tüm Ürünler" slide — tam yükseklik, sağ taraf */}
          <div className="flex-shrink-0 pl-3 self-stretch">
            <LocalizedClientLink
              href={allProductsHref ?? (seller_handle ? `/sellers/${seller_handle}` : "/categories")}
              aria-label="Tüm Ürünleri Gör"
              className="
                group
                flex items-center justify-center
                h-full w-14
                bg-neutral-900
                hover:bg-neutral-800
                transition-colors duration-200
                rounded-sm
              "
            >
              <span
                className="
                  all-products-text
                  text-white font-semibold tracking-widest uppercase text-xs
                  transition-all duration-200
                  group-hover:tracking-[0.2em]
                "
              >
                Tümünü Gör
              </span>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
