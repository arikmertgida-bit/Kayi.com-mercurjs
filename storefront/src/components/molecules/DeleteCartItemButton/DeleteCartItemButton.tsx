"use client"

import { Button } from "@/components/atoms"
import { BinIcon } from "@/icons"
import { deleteLineItem } from "@/lib/data/cart"
import { toast } from "@/lib/helpers/toast"
import { useState } from "react"

export const DeleteCartItemButton = ({ id }: { id: string }) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const res = await deleteLineItem(id)
      if (res && !res.ok) {
        toast.error({
          title: "Error removing item",
          description: res.error?.message ?? "Could not remove item from cart",
        })
      }
    } catch (error: any) {
      toast.error({
        title: "Error removing item",
        description: error.message ?? "Could not remove item from cart",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="text"
      className="w-10 h-10 flex items-center justify-center p-0"
      onClick={() => handleDelete(id)}
      loading={isDeleting}
      disabled={isDeleting}
    >
      <BinIcon size={20} />
    </Button>
  )
}
