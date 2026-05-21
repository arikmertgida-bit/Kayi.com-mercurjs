"use client"

import { HttpTypes } from "@medusajs/types"
import { Button, Checkbox, Divider } from "@/components/atoms"
import { Modal } from "@/components/molecules"
import { useState } from "react"
import Image from "next/image"
import { convertToLocale } from "@/lib/helpers/money"
import { cn } from "@/lib/utils"
import { toast } from "@medusajs/ui"

export const OrderCancel = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const [open, setOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<HttpTypes.StoreOrderLineItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCancel = async () => {
    if (selectedItems.length === 0) {
      toast.error("İptal etmek için en az bir ürün seçin.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast.error(data?.message ?? "Sipariş iptal edilemedi. Lütfen tekrar deneyin.")
        return
      }

      setOpen(false)
      toast.success("Siparişiniz başarıyla iptal edildi.")
    } catch {
      toast.error("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectItem = (item: HttpTypes.StoreOrderLineItem) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id))
    } else {
      setSelectedItems([...selectedItems, item])
    }
  }

  const handleChangeQuantity = (item: HttpTypes.StoreOrderLineItem, quantity: number) => {
    const itemline = selectedItems.find((i) => i.id === item.id)
    if (itemline) {
      itemline.quantity += quantity
      setSelectedItems([...selectedItems])
    }
  }

  return (
    <>
      <div className="md:flex justify-between items-center">
        <div className="mb-4 md:mb-0">
          <h2 className="text-primary label-lg uppercase">Siparişi İptal Et</h2>
          <p className="text-secondary label-md max-w-sm">
            Siparişinizi, satıcı hazırlık sürecine başlayana kadar iptal edebilirsiniz.
          </p>
        </div>
        <Button
          variant="tonal"
          className="uppercase"
          onClick={() => setOpen(true)}
        >
          İptal Et
        </Button>
      </div>
      {open && (
        <Modal
          heading="İptal etmek istediğiniz ürünleri seçin"
          onClose={() => setOpen(false)}
        >
          <div>
            <ul className="px-4">
              {(order.items ?? []).map((item: HttpTypes.StoreOrderLineItem) => {
                const isSelected = selectedItems.includes(item)
                const itemline = selectedItems.find((i) => i.id === item.id)
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-4 p-4 mb-2 rounded-sm",
                      isSelected && "bg-secondary/70"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectItem(item)}
                    />
                    <div className="flex gap-4 w-full">
                      <div className="w-16 rounded-sm border">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.subtitle ?? ""}
                            width={60}
                            height={60}
                            className="rounded-sm"
                          />
                        ) : (
                          <Image
                            src={"/images/placeholder.svg"}
                            alt={item.subtitle ?? ""}
                            width={60}
                            height={60}
                            className="opacity-25 scale-75"
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 w-full">
                        <div className="col-span-2">
                          <p className="text-primary label-md truncate w-full">
                            {item.subtitle}
                          </p>
                          <p className="text-secondary label-sm truncate w-full">
                            {item.title}
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          {isSelected && (
                            <div className="flex items-center mt-2">
                              <Button
                                variant="text"
                                className="w-8 h-8 flex items-center justify-center !bg-transparent !hover:bg-secondary"
                                disabled={item.quantity === 1}
                                onClick={() => handleChangeQuantity(item, -1)}
                              >
                                -
                              </Button>
                              <div className="text-primary font-medium border rounded-sm w-8 h-8 text-center flex items-center justify-center bg-primary">
                                {item.quantity}
                              </div>
                              <Button
                                variant="text"
                                className="w-8 h-8 flex items-center justify-center !bg-transparent !hover:bg-secondary"
                                disabled={item.quantity === itemline?.quantity}
                                onClick={() => handleChangeQuantity(item, 1)}
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          <p className="text-primary label-lg">
                            {convertToLocale({
                              amount: item.total ?? 0,
                              currency_code: order.currency_code,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <Divider className="my-4" />
            <div className="px-4">
              <Button className="uppercase w-full" onClick={handleCancel} disabled={isSubmitting}>
                {isSubmitting ? "İptal ediliyor..." : "İptal talebinde bulun"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
