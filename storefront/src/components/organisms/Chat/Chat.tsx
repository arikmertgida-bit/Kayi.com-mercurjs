"use client"

import { Button } from "@/components/atoms"
import { MessengerChatBox } from "@/components/cells/MessengerChatBox/MessengerChatBox"
import { Modal } from "@/components/molecules"
import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"
import { MessageIcon } from "@/icons"
import { useMessenger } from "@/providers/MessengerProvider"

export const Chat = ({
  user,
  seller,
  buttonClassNames,
  icon,
  product,
  subject,
  order_id,
}: {
  user: HttpTypes.StoreCustomer | null
  seller: SellerProps
  buttonClassNames?: string
  icon?: boolean
  product?: HttpTypes.StoreProduct
  subject?: string
  order_id?: string
}) => {
  const [modal, setModal] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { startConversation } = useMessenger()

  if (!user) return null

  const handleOpen = async () => {
    setModal(true)
    if (!conversationId) {
      const cid = await startConversation({
        targetUserId: seller.id,
        targetUserType: "SELLER",
        subject: subject || product?.title,
        productId: product?.id,
        orderId: order_id,
      })
      setConversationId(cid)
    }
  }

  return (
    <>
      <Button
        variant="tonal"
        onClick={handleOpen}
        className={buttonClassNames}
      >
        {icon ? <MessageIcon size={20} /> : "Write to seller"}
      </Button>
      {modal && conversationId && (
        <Modal heading="Chat" onClose={() => setModal(false)}>
          <div className="px-4 h-[520px]">
            <MessengerChatBox
              conversationId={conversationId}
              currentUserId={user.id}
              otherUser={{
                id: seller.id,
                name: seller.name || "Satıcı",
                avatarUrl: seller.photo,
                userType: "SELLER",
              }}
              onClose={() => setModal(false)}
            />
          </div>
        </Modal>
      )}
    </>
  )
}
