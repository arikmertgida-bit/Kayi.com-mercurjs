"use client"

import useEmblaCarousel from "embla-carousel-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

const SLIDES = [
  { src: "/images/slider/slider1.jpeg", alt: "Slider 1" },
  { src: "/images/slider/slider2.jpeg", alt: "Slider 2" },
  { src: "/images/slider/slider3.jpeg", alt: "Slider 3" },
  { src: "/images/slider/slider4.jpeg", alt: "Slider 4" },
  { src: "/images/slider/slider5.jpeg", alt: "Slider 5" },
  { src: "/images/slider/slider6.jpeg", alt: "Slider 6" },
  { src: "/images/slider/slider7.jpeg", alt: "Slider 7" },
]

function ChevronLeftIcon() {
  return (
    <svg
      width="28"
      height="28"
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
      width="28"
      height="28"
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

export const HeroSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    duration: 30,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect).on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <section className="w-full relative aspect-[1920/400] mt-[5px] overflow-hidden rounded-[10px]">
      <div className="overflow-hidden absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {SLIDES.map((slide, index) => (
            <div key={index} className="relative flex-[0_0_100%] h-full">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover"
                priority={index === 0}
                fetchPriority={index === 0 ? "high" : "low"}
                loading={index === 0 ? undefined : "lazy"}
                quality={index === 0 ? 85 : 75}
                sizes="100vw"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sol ok */}
      <button
        onClick={scrollPrev}
        aria-label="Önceki görsel"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/70 hover:bg-white text-primary transition-all duration-200 shadow-md"
      >
        <ChevronLeftIcon />
      </button>

      {/* Sağ ok */}
      <button
        onClick={scrollNext}
        aria-label="Sonraki görsel"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/70 hover:bg-white text-primary transition-all duration-200 shadow-md"
      >
        <ChevronRightIcon />
      </button>

      {/* Nokta indikatörleri */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Görsel ${index + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              selectedIndex === index
                ? "bg-white scale-125"
                : "bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
