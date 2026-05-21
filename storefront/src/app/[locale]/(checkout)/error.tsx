"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error("Checkout route error:", error.message)
  }, [error])

  return (
    <div className="flex flex-col gap-4 items-center justify-center py-24 container">
      <h1 className="text-2xl-semi text-ui-fg-base">Ödeme Sayfasında Hata</h1>
      <p className="text-small-regular text-ui-fg-base">
        Ödeme işlemi sırasında beklenmedik bir hata meydana geldi. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 bg-action text-action-on-primary rounded-sm text-sm font-medium"
      >
        Tekrar Dene
      </button>
    </div>
  )
}
