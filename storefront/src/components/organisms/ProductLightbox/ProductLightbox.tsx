"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import useEmblaCarousel from "embla-carousel-react"
import { HttpTypes } from "@medusajs/types"
import { EmblaCarouselType } from "embla-carousel"
import { CloseIcon } from "@/icons"
import { cn } from "@/lib/utils"

export const ProductLightbox = ({
  slides = [],
  startIndex = 0,
  onClose,
}: {
  slides: HttpTypes.StoreProduct["images"]
  startIndex?: number
  onClose: () => void
}) => {
  const [mounted, setMounted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(startIndex)

  const [mainEmblaRef, mainEmblaApi] = useEmblaCarousel({
    axis: "x",
    loop: true,
    startIndex,
    align: "center",
  })

  const [thumbEmblaRef, thumbEmblaApi] = useEmblaCarousel({
    axis: "x",
    loop: true,
    startIndex,
    align: "center",
    dragFree: true,
  })

  const onSelect = useCallback((api: EmblaCarouselType) => {
    const index = api.selectedScrollSnap()
    setSelectedIndex(index)
  }, [])

  useEffect(() => {
    if (!mainEmblaApi) return
    onSelect(mainEmblaApi)
    mainEmblaApi.on("select", onSelect).on("reInit", onSelect)
    return () => {
      mainEmblaApi.off("select", onSelect).off("reInit", onSelect)
    }
  }, [mainEmblaApi, onSelect])

  // Sync thumbnail carousel when main changes
  useEffect(() => {
    if (!thumbEmblaApi) return
    thumbEmblaApi.scrollTo(selectedIndex)
  }, [selectedIndex, thumbEmblaApi])

  const scrollToSlide = useCallback(
    (index: number) => {
      mainEmblaApi?.scrollTo(index)
    },
    [mainEmblaApi]
  )

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !slides?.length) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
        aria-label="Close lightbox"
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[300] hover:opacity-70 transition-opacity p-2 bg-black/50 rounded-full"
        aria-label="Close"
      >
        <CloseIcon size={24} color="#ffffff" />
      </button>

      {/* Slide counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[300] text-white text-sm font-medium select-none pointer-events-none">
        {selectedIndex + 1} / {slides.length}
      </div>

      {/* Main carousel — dikey ve yatay ortada */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center px-4 py-4 min-h-0">
        {/* Wrapper: sabit yükseklik, oklar bu div'e göre konumlanır */}
        <div
          className="relative w-full max-w-3xl"
          style={{ height: "clamp(260px, 60vh, 680px)" }}
        >
          <div ref={mainEmblaRef} style={{ overflow: "hidden", height: "100%" }}>
            <div className="flex h-full">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="flex-[0_0_100%] min-w-0 relative h-full"
                >
                  <Image
                    src={decodeURIComponent(slide.url)}
                    alt={slide.alt ?? `Product image ${idx + 1}`}
                    fill
                    quality={90}
                    priority={idx === startIndex}
                    sizes="(min-width: 1280px) 768px, (min-width: 768px) 80vw, 100vw"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Oklar — görselin tam ortasına hizalı */}
          {slides.length > 1 && (
            <>
              <button
                onClick={() => mainEmblaApi?.scrollPrev()}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-[200] text-white hover:opacity-70 transition-opacity p-2 bg-black/50 rounded-full"
                aria-label="Previous image"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={() => mainEmblaApi?.scrollNext()}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-[200] text-white hover:opacity-70 transition-opacity p-2 bg-black/50 rounded-full"
                aria-label="Next image"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {slides.length > 1 && (
        <div className="relative z-10 w-full max-w-3xl px-4 pb-4">
          <div ref={thumbEmblaRef} style={{ overflow: "hidden" }}>
            <div className="flex gap-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => scrollToSlide(idx)}
                  className={cn(
                    "flex-[0_0_auto] w-14 h-14 sm:w-16 sm:h-16 relative rounded-sm overflow-hidden border-2 transition-colors duration-200 flex-shrink-0",
                    selectedIndex === idx
                      ? "border-white"
                      : "border-white/30 hover:border-white/60"
                  )}
                  aria-label={`Go to image ${idx + 1}`}
                >
                  <Image
                    src={decodeURIComponent(slide.url)}
                    alt={slide.alt ?? `Thumbnail ${idx + 1}`}
                    fill
                    sizes="64px"
                    quality={60}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
