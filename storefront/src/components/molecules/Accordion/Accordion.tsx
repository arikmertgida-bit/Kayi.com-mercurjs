"use client"
import { Card } from "@/components/atoms"
import { CollapseIcon } from "@/icons"
import { cn } from "@/lib/utils"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

// Use useLayoutEffect on the client (avoids SSR warning while measuring synchronously)
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

export const Accordion = ({
  children,
  heading,
  defaultOpen = true,
  durationMs = 300,
  customHeader,
}: {
  children: React.ReactNode
  heading: string
  defaultOpen?: boolean
  durationMs?: number
  customHeader?: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [height, setHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Measure synchronously after layout so there's no frame delay
  useIsomorphicLayoutEffect(() => {
    if (!contentRef.current) return

    // Initial measurement
    setHeight(contentRef.current.scrollHeight)

    // Keep height in sync when children change (e.g. filter list updates)
    const observer = new ResizeObserver(() => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight)
      }
    })
    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [children])

  const openHandler = () => {
    setIsOpen(!isOpen)
  }

  return (
    <Card>
      <div
        onClick={openHandler}
        className="flex justify-between items-center cursor-pointer px-2"
      >
        {customHeader ?? <h4 className="label-lg uppercase">{heading}</h4>}
        <CollapseIcon
          size={20}
          className={cn("transition-all duration-300", isOpen && "rotate-180")}
        />
      </div>
      <div
        className={cn("transition-all duration-300 overflow-hidden")}
        style={{
          maxHeight: isOpen ? (height !== null ? `${height}px` : "none") : "0px",
          opacity: isOpen ? 1 : 0,
          transition: `max-height ${durationMs / 1000}s ease-in-out, opacity ${(durationMs * 0.67) / 1000}s ease-in-out`,
        }}
      >
        <div ref={contentRef} className="pt-4">
          {children}
        </div>
      </div>
    </Card>
  )
}
