"use client"

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react"
import { useParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useMessenger } from "@/providers/MessengerProvider"
import type { Message } from "@/lib/messenger/types"
import type { SellerProps } from "@/types/seller"

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getSellerAvatar(seller: SellerProps): string | null {
  // Prefer member profile photo (Profil Fotoğrafı), fall back to store photo
  const owner =
    seller.members?.find((m) => m.role === "owner" || m.role === "admin") ??
    seller.members?.[0]
  return owner?.photo ?? seller.photo ?? null
}

function Initials({ name, size, gradient = "from-amber-400 to-amber-600" }: { name: string; size: number; gradient?: string }) {
  const text = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {text}
    </div>
  )
}

function CustomerAvatar({ name, size }: { name: string; size: number }) {
  return <Initials name={name} size={size} gradient="from-blue-400 to-indigo-500" />
}

// WhatsApp-style read receipt ticks
function MessageTicks({ readAt }: { readAt: string | null }) {
  if (readAt) {
    return (
      <svg className="w-[14px] h-[14px] text-blue-400 flex-shrink-0" viewBox="0 0 20 12" fill="none">
        <path d="M1 6L5.5 10.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 6L10.5 10.5L19 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  return (
    <svg className="w-[14px] h-[14px] text-gray-400 flex-shrink-0" viewBox="0 0 20 12" fill="none">
      <path d="M1 6L5.5 10.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L10.5 10.5L19 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SellerAvatar({
  seller,
  size,
}: {
  seller: SellerProps
  size: number
}) {
  const src = getSellerAvatar(seller)
  if (src) {
    return (
      <Image
        src={decodeURIComponent(src)}
        alt={seller.name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        unoptimized
      />
    )
  }
  return <Initials name={seller.name} size={size} />
}

// ────────────────────────────────────────────────────────────────────────────
// TypingDots
// ────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MessageBubble
// ────────────────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isMine,
  showAvatar,
  showAvatarMine,
  isFirst,
  seller,
  currentUser,
}: {
  message: Message
  isMine: boolean
  showAvatar: boolean
  showAvatarMine: boolean
  isFirst: boolean
  seller: SellerProps
  currentUser: { id: string; name: string } | null
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const isImage = message.messageType === "IMAGE"
  const isNotification = message.messageType === "NOTIFICATION"

  if (isNotification) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} group`}
    >
      {/* Seller avatar — left side */}
      {!isMine && (
        <div className="mb-1 flex-shrink-0">
          {showAvatar ? (
            <SellerAvatar seller={seller} size={26} />
          ) : (
            <div className="w-[26px]" />
          )}
        </div>
      )}
      {/* Customer avatar — right side */}
      {isMine && (
        <div className="mb-1 flex-shrink-0">
          {showAvatarMine ? (
            <CustomerAvatar name={currentUser?.name ?? "Ben"} size={26} />
          ) : (
            <div className="w-[26px]" />
          )}
        </div>
      )}

      <div
        className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}
      >
        {/* Sender name label — first message of a group */}
        {isFirst && (
          <span className={`text-[11px] font-medium mb-0.5 px-1 ${isMine ? "text-blue-500" : "text-gray-500"}`}>
            {isMine ? (currentUser?.name ?? "Ben") : seller.name}
          </span>
        )}
        {isImage && message.imageUrl ? (
          <>
            <button
              onClick={() => setLightboxOpen(true)}
              className={`rounded-2xl overflow-hidden cursor-zoom-in border-0 p-0 ${
                isMine ? "rounded-br-sm" : "rounded-bl-sm"
              }`}
            >
              <Image
                src={message.imageUrl}
                alt="Görsel"
                width={220}
                height={220}
                className="object-cover max-h-56 rounded-2xl hover:opacity-90 transition-opacity"
                unoptimized
              />
            </button>
            {lightboxOpen && (
              <div
                className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                onClick={() => setLightboxOpen(false)}
              >
                <Image
                  src={message.imageUrl}
                  alt="Tam boyut"
                  width={900}
                  height={900}
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                  unoptimized
                />
              </div>
            )}
          </>
        ) : (
          <div
            className={`px-4 py-2.5 rounded-[22px] text-sm leading-relaxed break-words ${
              isMine
                ? "bg-blue-500 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-900 rounded-bl-sm"
            }`}
          >
            {message.content}
          </div>
        )}

        <div
          className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
            isMine ? "flex-row" : "flex-row"
          }`}
        >
          {isMine && <MessageTicks readAt={message.readAt} />}
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// IYI Damgası (Messenger logo PNG)
// ────────────────────────────────────────────────────────────────────────────

function IYIDamga({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/messenger-logo.png"
      alt="Kayı.com Messenger"
      width={size}
      height={size}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      unoptimized
    />
  )
}

// ────────────────────────────────────────────────────────────────────────────
// WelcomeScreen
// ────────────────────────────────────────────────────────────────────────────

function WelcomeScreen({ seller }: { seller: SellerProps }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-10 text-center">
      <div className="relative mb-5">
        <div className="rounded-full p-1 bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-500 shadow-lg">
          <div className="rounded-full overflow-hidden bg-white p-0.5">
            <SellerAvatar seller={seller} size={72} />
          </div>
        </div>
      </div>
      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">
        {seller.name}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
        Merhaba!{" "}
        <span className="font-medium text-gray-600">{seller.name}</span>{" "}
        mağazasına hoş geldiniz. Ürünlerimiz veya siparişiniz hakkında size nasıl yardımcı olabiliriz?
      </p>
      <div className="mt-6 flex items-center gap-1.5 text-xs text-gray-300">
        <IYIDamga size={20} />
        <span>Kayı.com güvencesiyle</span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// GuestScreen (not logged in)
// ────────────────────────────────────────────────────────────────────────────

function GuestScreen({ seller }: { seller: SellerProps }) {
  const { locale } = useParams<{ locale: string }>()
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-10 text-center">
      <SellerAvatar seller={seller} size={64} />
      <h3 className="font-bold text-gray-900 text-base mt-4 mb-2">{seller.name}</h3>
      <p className="text-sm text-gray-400 mb-6">
        Satıcıya mesaj göndermek için giriş yapmanız gerekiyor.
      </p>
      <Link
        href={`/${locale}/user`}
        className="px-5 py-2.5 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
      >
        Giriş Yap
      </Link>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Widget
// ────────────────────────────────────────────────────────────────────────────

interface SellerMessengerWidgetProps {
  seller: SellerProps
  /** Authenticated customer id (null = not logged in) */
  currentUserId: string | null
  /** Authenticated customer display info */
  currentUser?: { id: string; name: string } | null
}

export function SellerMessengerWidget({
  seller,
  currentUserId,
  currentUser = null,
}: SellerMessengerWidgetProps) {
  const {
    conversations,
    messages,
    typingUserIds,
    isLoadingMessages,
    isConnected,
    sendMessage,
    uploadImage,
    startTyping,
    stopTyping,
    openConversation,
    closeConversation,
    startConversation,
  } = useMessenger()

  // Resolve the owner member ID (mem_...) which is what the vendor panel socket uses
  const ownerMember = seller.members?.find((m) => m.role === "owner" || m.role === "admin") ?? seller.members?.[0]
  const memberUserId = ownerMember?.id ?? seller.id

  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<{ title: string; thumbnail: string | null; handle: string | null } | null>(null)
  const [responseTime, setResponseTime] = useState<{
    avgMinutes: number | null
    isWithinHours: boolean
  } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detect mobile
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Fetch seller response time
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_MESSENGER_URL || "http://localhost:4000"
    fetch(`${url}/api/conversations/seller/${seller.id}/response-time`)
      .then((r) => r.json())
      .then((data) => setResponseTime(data))
      .catch(() => {/* silent fail */})
  }, [seller.id])

  // Find existing conversation with this seller (match by seller.id OR member ID)
  const existingConversation = conversations.find((c) =>
    c.participants.some(
      (p) => (p.userId === seller.id || p.userId === memberUserId) && p.userType === "SELLER"
    )
  )

  // Unread count for this specific seller conversation
  const unreadCount = (() => {
    const conv = existingConversation
    if (!conv || !currentUserId) return 0
    const myParticipant = conv.participants.find(
      (p) => p.userId === currentUserId
    )
    return myParticipant?.unreadCount ?? 0
  })()

  // When widget opens, load the conversation if it already exists
  useEffect(() => {
    if (!isOpen || !currentUserId) return

    const conv = existingConversation
    if (conv && conversationId !== conv.id) {
      setConversationId(conv.id)
      openConversation(conv.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingConversation?.id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUserIds])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }, [text])

  // Fetch product info when there's a product conversation
  useEffect(() => {
    const pid = existingConversation?.productId
    if (!pid) { setProductInfo(null); return }
    fetch(`/api/product/${encodeURIComponent(pid)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.product) {
          setProductInfo({ title: data.product.title, thumbnail: data.product.thumbnail ?? null, handle: data.product.handle ?? null })
        } else {
          setProductInfo(null)
        }
      })
      .catch(() => setProductInfo(null))
  }, [existingConversation?.productId])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    // Lock scroll on mobile
    if (window.innerWidth < 640) {
      document.body.style.overflow = "hidden"
    }
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    document.body.style.overflow = ""
    closeConversation()
  }, [closeConversation])

  const handleSend = useCallback(async () => {
    if (!currentUserId) return

    if (!pendingImage && !text.trim()) return
    if (isSending) return

    setIsSending(true)
    setSendError(null)
    const content = text.trim()

    // Ensure conversation exists
    let activeConvId = conversationId
    if (!activeConvId) {
      setIsStarting(true)
      try {
        const newConvId = await startConversation({
          targetUserId: memberUserId,
          targetUserType: "SELLER",
          subject: `${seller.name} ile sohbet`,
          contextType: "VENDOR_BASED",
        })
        setConversationId(newConvId)
        await openConversation(newConvId)
        activeConvId = newConvId
      } catch (err) {
        console.error("[SellerMessengerWidget] startConversation error:", err)
        setSendError("Sohbet başlatılamadı. Tekrar deneyin.")
        setIsSending(false)
        setIsStarting(false)
        return
      } finally {
        setIsStarting(false)
      }
    }

    // Upload pending image first
    if (pendingImage) {
      const file = pendingImage
      setPendingImage(null)
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
        setPendingImagePreview(null)
      }
      try {
        await uploadImage(file)
      } catch (err) {
        console.error("[SellerMessengerWidget] image upload error:", err)
        setSendError("Görsel gönderilemedi. Lütfen tekrar deneyin.")
        setIsSending(false)
        return
      }
    }

    // Then send text if any
    if (content) {
      setText("")
      stopTyping()
      try {
        await sendMessage(content)
      } catch (err) {
        console.error("[SellerMessengerWidget] send error:", err)
        setText(content)
        setSendError("Mesaj gönderilemedi. Tekrar deneyin.")
      }
    }

    setIsSending(false)
  }, [
    text,
    pendingImage,
    pendingImagePreview,
    isSending,
    currentUserId,
    conversationId,
    memberUserId,
    seller.name,
    startConversation,
    openConversation,
    sendMessage,
    stopTyping,
    uploadImage,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    startTyping()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const isOtherTyping = typingUserIds.includes(seller.id)
  const hasMessages = messages.length > 0
  const isConversationActive = !!conversationId

  // ── Window dimensions ──────────────────────────────────────────────────

  const windowClass = isMobile
    ? "fixed inset-0 z-[9000] flex flex-col bg-white"
    : "fixed bottom-24 right-6 z-[9000] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"

  const windowStyle = isMobile
    ? {}
    : { width: 380, height: 560 }

  return (
    <>
      {/* ── Floating Button ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="floating-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={handleOpen}
            aria-label="Satıcıya mesaj gönder"
            className="fixed bottom-6 right-6 z-[8999] w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-xl hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            style={{
              background: "transparent",
              padding: 0,
            }}
          >
            {/* Story ring */}
            <div
              className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #D4A017 0%, #8B6914 50%, #D4A017 100%)",
                padding: 2.5,
              }}
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden">
                  {getSellerAvatar(seller) ? (
                    <Image
                      src={decodeURIComponent(getSellerAvatar(seller)!)}
                      alt={seller.name}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg"
                    >
                      {seller.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Window ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={windowClass}
            style={windowStyle}
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
              {/* IYI Damga + Logo */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <IYIDamga size={26} />
              </div>

              {/* Store name — clickable */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/tr/sellers/${seller.handle}`}
                  className="font-extrabold text-gray-900 text-sm hover:text-amber-700 transition-colors truncate block leading-tight"
                >
                  {seller.name}
                </Link>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5 flex items-center gap-1">
                  {responseTime === null ? (
                    <span className="text-gray-300">Yükleniyor…</span>
                  ) : responseTime.isWithinHours ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block flex-shrink-0" />
                      {responseTime.avgMinutes !== null
                        ? `Ort. ${responseTime.avgMinutes < 60
                            ? `${responseTime.avgMinutes} dak.`
                            : `${Math.round(responseTime.avgMinutes / 60)} sa.`} içinde yanıt`
                        : "Genellikle hızlı yanıt"}
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block flex-shrink-0" />
                      {responseTime.avgMinutes !== null
                        ? `Ort. ${responseTime.avgMinutes < 60
                            ? `${responseTime.avgMinutes} dak.`
                            : `${Math.round(responseTime.avgMinutes / 60)} sa.`} içinde yanıt`
                        : "Mesaj bırakabilirsiniz"}
                    </>
                  )}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                aria-label="Kapat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* ── Body ───────────────────────────────────────────────── */}
            {!currentUserId ? (
              <GuestScreen seller={seller} />
            ) : (
              <>
                {/* Product context banner */}
                {productInfo && isConversationActive && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-amber-100">
                      {productInfo.thumbnail ? (
                        <Image src={productInfo.thumbnail} alt={productInfo.title} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-300">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-amber-600 font-medium">Ürün hakkında soru</p>
                      {productInfo.handle ? (
                        <a href={`/tr/products/${productInfo.handle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gray-800 hover:text-amber-600 hover:underline truncate block transition-colors">
                          {productInfo.title} ↗
                        </a>
                      ) : (
                        <p className="text-xs font-semibold text-gray-800 truncate">{productInfo.title}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth">
                  {isLoadingMessages || isStarting ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : !isConversationActive || !hasMessages ? (
                    <WelcomeScreen seller={seller} />
                  ) : (
                    messages.map((msg, idx) => {
                      const isMine = msg.senderId === currentUserId
                      const prevMsg = messages[idx - 1]
                      const nextMsg = messages[idx + 1]
                      // Show avatar on LAST message of a group
                      const showAvatar =
                        !isMine &&
                        (nextMsg?.senderId !== msg.senderId || !nextMsg || nextMsg.messageType === "NOTIFICATION")
                      const showAvatarMine =
                        isMine &&
                        (nextMsg?.senderId !== msg.senderId || !nextMsg || nextMsg.messageType === "NOTIFICATION")
                      // Show name on FIRST message of a group
                      const isFirst =
                        !prevMsg ||
                        prevMsg.senderId !== msg.senderId ||
                        prevMsg.messageType === "NOTIFICATION"

                      return (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isMine={isMine}
                          showAvatar={showAvatar}
                          showAvatarMine={showAvatarMine}
                          isFirst={isFirst}
                          seller={seller}
                          currentUser={currentUser}
                        />
                      )
                    })
                  )}

                  {/* Typing indicator */}
                  {isOtherTyping && (
                    <div className="flex items-end gap-2">
                      <SellerAvatar seller={seller} size={26} />
                      <div className="bg-gray-100 rounded-[22px] rounded-bl-sm">
                        <TypingDots />
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* ── Input Bar ──────────────────────────────────────── */}
                <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                  {!isConnected && (
                    <div className="mb-2 px-3 py-1.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                      Bağlantı kesildi, yeniden bağlanılıyor…
                    </div>
                  )}
                  {sendError && (
                    <p className="text-xs text-red-500 px-1 pb-1">{sendError}</p>
                  )}
                  <div className="flex items-end gap-2 bg-gray-50 rounded-[28px] px-3 py-2 border border-gray-200 focus-within:border-amber-400 transition-colors">
                    {/* Image upload */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors flex-shrink-0 mb-0.5"
                      aria-label="Fotoğraf gönder"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {/* Pending image preview */}
                    {pendingImagePreview && (
                      <div className="relative flex-shrink-0 mb-0.5">
                        <img
                          src={pendingImagePreview}
                          alt="Gönderilecek görsel"
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(pendingImagePreview)
                            setPendingImagePreview(null)
                            setPendingImage(null)
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-500 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Text input */}
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Mesaj yaz…"
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none py-1 leading-snug max-h-24 overflow-y-auto"
                    />

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={(!text.trim() && !pendingImage) || isSending}
                      aria-label="Gönder"
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5 ${
                        (text.trim() || pendingImage) && !isSending
                          ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                          : "text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
