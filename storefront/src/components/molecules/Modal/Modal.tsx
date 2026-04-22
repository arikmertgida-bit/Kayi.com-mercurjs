"use client"

import { CloseIcon } from "@/icons"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

export const Modal = ({
  children,
  heading,
  onClose,
  className,
}: {
  children: React.ReactNode
  heading: string
  onClose: () => void
  className?: string
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 flex justify-center items-center z-[9999]">
      <div
        className="bg-black/75 w-full h-full absolute"
        onClick={onClose}
      />
      <div
        className={`absolute z-[10000] py-5 rounded-sm w-full mx-4 max-h-[90vh] overflow-y-auto shadow-lg ${className ?? "bg-primary max-w-[600px]"}`}
      >
        <div className="uppercase flex justify-between items-center heading-md border-b px-4 pb-5">
          {heading}
          <div onClick={onClose} className="cursor-pointer">
            <CloseIcon size={20} />
          </div>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
