"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useEffect, useState } from "react"
import { EmblaCarouselType } from "embla-carousel"
import { CategoryCard } from "@/components/organisms"

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

type Category = {
  id: string
  handle: string
  name: string
  thumbnail?: string | null
}

export function HomeCategoriesCarousel({ categories }: { categories: Category[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  })

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

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

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const btnBase =
    "absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:bg-[#e30a17] transition-all duration-200 active:scale-95"

  return (
    <div className="relative">
      <button
        onClick={scrollPrev}
        aria-label="Önceki kategoriler"
        className={`${btnBase} left-0 ${canScrollPrev ? "" : "invisible"}`}
      >
        <ChevronLeftIcon />
      </button>
      <button
        onClick={scrollNext}
        aria-label="Sonraki kategoriler"
        className={`${btnBase} right-0 ${canScrollNext ? "" : "invisible"}`}
      >
        <ChevronRightIcon />
      </button>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {categories.map((category) => (
            <div key={category.id} className="category-slide">
              <CategoryCard
                category={{
                  name: category.name,
                  handle: category.handle ?? "",
                  thumbnail: category.thumbnail,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
