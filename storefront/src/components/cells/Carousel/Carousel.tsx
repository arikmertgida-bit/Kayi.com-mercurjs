"use client"

import useEmblaCarousel from "embla-carousel-react"

import { Indicator } from "@/components/atoms"
import { useCallback, useEffect, useState } from "react"
import { EmblaCarouselType } from "embla-carousel"

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
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

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
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

export const CustomCarousel = ({
  variant = "light",
  items,
  align = "start",
}: {
  variant?: "light" | "dark"
  items: React.ReactNode[]
  align?: "center" | "start" | "end"
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(true)
  const [canScrollNext, setCanScrollNext] = useState(true)

  const maxStep = items.length

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    onSelect(emblaApi)
    emblaApi.on("reInit", onSelect).on("select", onSelect)
    return () => {
      emblaApi.off("reInit", onSelect).off("select", onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const btnClass = `
    absolute top-1/2 -translate-y-1/2 z-10
    flex items-center justify-center
    w-10 h-10 rounded-full
    bg-[#000000] text-[#fcfcfc]
    hover:bg-[#e30a17] hover:text-[#fcfcfc]
    transition-all duration-200
    active:scale-95
  `

  return (
    <div className="embla relative w-full">
      <div className="relative">
        <button
          onClick={scrollPrev}
          aria-label="Previous"
          className={`${btnClass} left-2`}
        >
          <ChevronLeftIcon />
        </button>
        <button
          onClick={scrollNext}
          aria-label="Next"
          className={`${btnClass} right-2`}
        >
          <ChevronRightIcon />
        </button>

        <div
          className="embla__viewport overflow-hidden rounded-xs w-full"
          ref={emblaRef}
        >
          <div className="embla__container flex">
            {items.map((slide) => slide)}
          </div>
        </div>
      </div>

      {/* Mobile: indicator */}
      <div className="flex justify-start items-center mt-4 sm:hidden">
        <div className="w-1/2">
          <Indicator
            variant={variant}
            maxStep={maxStep}
            step={selectedIndex + 1}
          />
        </div>
      </div>
    </div>
  )
}
