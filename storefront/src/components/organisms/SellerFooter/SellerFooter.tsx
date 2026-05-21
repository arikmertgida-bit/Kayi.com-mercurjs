"use client"
import { Button, Divider } from "@/components/atoms"
import { Modal, ReportSellerForm } from "@/components/molecules"
import { DoneIcon } from "@/icons"
import { SingleProductSeller } from "@/types/product"
import { SellerProps } from "@/types/seller"
import { format } from "date-fns"
import { useState } from "react"

export const SellerFooter = ({ seller }: { seller: SellerProps }) => {
  const [openModal, setOpenModal] = useState(false)
  return (
    <div className="flex justify-between items-center flex-col lg:flex-row">
      <div className="flex gap-2 lg:gap-4 items-center label-sm lg:label-md text-secondary mb-4 lg:mb-0 justify-between w-full lg:justify-start lg:w-auto">
        <Divider square />
        <p>Katılım: {format(seller.created_at, "dd.MM.yyyy")}</p>
      </div>
      <Button
        variant="text"
        size="large"
        className="uppercase"
        onClick={() => setOpenModal(true)}
      >
        Şikayet Et
      </Button>
      {openModal && (
        <Modal heading="Satıcıyı Şikayet Et" onClose={() => setOpenModal(false)}>
          <ReportSellerForm sellerId={seller.id} onClose={() => setOpenModal(false)} />
        </Modal>
      )}
    </div>
  )
}
