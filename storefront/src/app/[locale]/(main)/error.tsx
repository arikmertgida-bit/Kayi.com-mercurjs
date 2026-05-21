"use client"

import { useEffect } from "react"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ArrowUpIcon } from "@/icons"
import { logger } from "@/lib/logger"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service if available
    logger.error("Route error:", error.message)
  }, [error])

  return (
    <div className="flex flex-col gap-4 items-center justify-center py-24 container">
      <h1 className="text-2xl-semi text-ui-fg-base">Bir Hata Oluştu</h1>
      <p className="text-small-regular text-ui-fg-base">
        Sayfa yüklenirken beklenmedik bir hata meydana geldi.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-action text-action-on-primary rounded-sm text-sm font-medium"
        >
          Tekrar Dene
        </button>
        <LocalizedClientLink className="flex gap-x-1 items-center group px-4 py-2" href="/">
          Ana Sayfaya Dön
          <ArrowUpIcon
            className="group-hover:rotate-45 ease-in-out duration-150"
            color="var(--fg-interactive)"
          />
        </LocalizedClientLink>
      </div>
    </div>
  )
}
