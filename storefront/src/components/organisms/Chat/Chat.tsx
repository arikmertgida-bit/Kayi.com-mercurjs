"use client"

import { Button } from "@/components/atoms"
import { MessengerChatBox } from "@/components/cells/MessengerChatBox/MessengerChatBox"
import { Modal } from "@/components/molecules"
import { useState, useEffect } from "react"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"
import { MessageIcon } from "@/icons"
import { useMessenger } from "@/providers/MessengerProvider"
import { MSG } from "@/lib/messenger/strings"

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
  const [showConfirmation, setShowConfirmation] = useState(false)
  const { startConversation } = useMessenger()

  // Auto-dismiss confirmation popup after 5s
  useEffect(() => {
    if (!showConfirmation) return
    const t = setTimeout(() => setShowConfirmation(false), 5000)
    return () => clearTimeout(t)
  }, [showConfirmation])

  if (!user) return null

  // Use owner/admin member photo; fallback to first member photo; finally undefined
  const ownerMember =
    seller.members?.find((m) => m.role === "owner" || m.role === "admin") ??
    seller.members?.[0]
  const memberPhoto = ownerMember?.photo ?? undefined
  const memberUserId = ownerMember?.id ?? seller.id

  const handleOpen = async () => {
    setModal(true)
    if (!conversationId) {
      try {
        const cid = await startConversation({
          targetUserId: memberUserId,
          targetUserType: "SELLER",
          subject: subject || product?.title,
          productId: product?.id,
          orderId: order_id,
        })
        setConversationId(cid)
      } catch (err) {
        console.error("[Chat] startConversation error:", err)
        setModal(false)
      }
    }
  }

  const handleFirstMessageSent = () => {
    setModal(false)
    setShowConfirmation(true)
  }

  return (
    <>
      <Button
        variant="tonal"
        onClick={handleOpen}
        className={buttonClassNames}
      >
        {icon ? <MessageIcon size={20} /> : "Satıcıya Sor"}
      </Button>

      {modal && conversationId && (
        <Modal heading="Satıcıya Sor" onClose={() => setModal(false)}>
          <div className="px-4 h-[520px]">
            <MessengerChatBox
              conversationId={conversationId}
              currentUserId={user.id}
              currentUserName={
                [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                user.email ||
                "Ben"
              }
              otherUser={{
                id: memberUserId,
                name: seller.name || MSG.SELLER_FALLBACK,
                avatarUrl: memberPhoto,
                userType: "SELLER",
              }}
              onClose={() => setModal(false)}
              onFirstMessageSent={handleFirstMessageSent}
            />
          </div>
        </Modal>
      )}

      {/* ── Confirmation Popup ─────────────────────────────────────── */}
      {showConfirmation && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Green top bar */}
          <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Product thumbnail or seller avatar */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                {product?.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title ?? "Ürün"}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : memberPhoto ? (
                  <Image
                    src={memberPhoto}
                    alt={seller.name ?? "Satıcı"}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {(seller.name?.[0] ?? "S").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {/* Check icon */}
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">Mesajınız İletildi</span>
                </div>
                {product?.title && (
                  <p className="text-xs text-gray-500 truncate mb-1 font-medium">{product.title}</p>
                )}
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-amber-600">{seller.name}</span> satıcısı mesajınızı aldı. Yanıtı{" "}
                  <a href="/tr/user/messages" className="text-amber-600 underline font-medium hover:text-amber-700">
                    Hesabım → Mesajlarım
                  </a>{" "}
                  bölümünde bulabilirsiniz.
                </p>
              </div>

              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-shrink-0 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                aria-label="Kapat"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
