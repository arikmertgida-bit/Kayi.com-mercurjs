"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import { useMessenger } from "@/providers/MessengerProvider"
import type { Message } from "@/lib/messenger/types"

interface MessengerChatBoxProps {
  /** The other participant's display info */
  otherUser: {
    id: string
    name: string
    avatarUrl?: string | null
    userType: "CUSTOMER" | "SELLER" | "ADMIN"
  }
  /** Current authenticated user's id */
  currentUserId: string
  /** Current authenticated user's display name */
  currentUserName: string
  /** Current authenticated user's profile photo */
  currentUserAvatarUrl?: string | null
  conversationId: string
  onClose: () => void
  /** Called after the FIRST message in a new conversation is successfully sent */
  onFirstMessageSent?: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

function Avatar({ src, name, size = 32, gradient = "from-purple-400 to-pink-400" }: { src?: string | null; name?: string | null; size?: number; gradient?: string }) {
  const safeName = name ?? ""
  const initials = safeName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  if (src) {
    return (
      <Image
        src={src}
        alt={safeName || "avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

function MessageBubble({
  message,
  isMine,
  showAvatar,
  showAvatarMine,
  isFirst,
  isFirstMine,
  otherUser,
  currentUserName,
  currentUserAvatarUrl,
  currentUserId,
  isDeleteTarget,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  message: Message
  isMine: boolean
  showAvatar: boolean
  showAvatarMine: boolean
  isFirst: boolean
  isFirstMine: boolean
  otherUser: MessengerChatBoxProps["otherUser"]
  currentUserName?: string | null
  currentUserAvatarUrl?: string | null
  currentUserId: string
  isDeleteTarget: boolean
  onRequestDelete: (id: string) => void
  onConfirmDelete: (id: string, deleteForAll: boolean) => void
  onCancelDelete: () => void
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
    <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} group`}>
      {/* Other user avatar — left side */}
      {!isMine && (
        <div className="mb-1 flex-shrink-0">
          {showAvatar ? (
            <Avatar src={otherUser.avatarUrl} name={otherUser.name} size={28} />
          ) : (
            <div className="w-7" />
          )}
        </div>
      )}

      {/* My avatar — right side */}
      {isMine && (
        <div className="mb-1 flex-shrink-0">
          {showAvatarMine ? (
            <Avatar src={currentUserAvatarUrl} name={currentUserName} size={28} gradient="from-blue-400 to-indigo-500" />
          ) : (
            <div className="w-7" />
          )}
        </div>
      )}

      <div className={`flex flex-col max-w-[65%] ${isMine ? "items-end" : "items-start"}`}>
        {/* Sender name label — first message in group */}
        {isFirst && (
          <span className={`text-[11px] font-medium mb-0.5 px-1 ${isMine ? "text-blue-500" : "text-gray-500"}`}>
            {isMine ? currentUserName : otherUser.name}
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
                alt="Görsel mesaj"
                width={240}
                height={240}
                className="object-cover max-h-60 rounded-2xl hover:opacity-90 transition-opacity"
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
                />
              </div>
            )}
          </>
        ) : (
          <div
            className={`px-4 py-2.5 rounded-[22px] text-sm leading-relaxed break-words ${
              isMine
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-900 rounded-bl-sm"
            }${message.deletedForAll ? " italic opacity-70" : ""}`}
          >
            {message.content}
          </div>
        )}

        {/* Trash icon + delete popup */}
        {!message.deletedForAll && (
          <div className={`relative flex items-center ${isMine ? "justify-end" : "justify-start"}`}>
            <button
              onClick={(e) => { e.stopPropagation(); onRequestDelete(message.id) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex-shrink-0"
              title="Mesajı Sil"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {isDeleteTarget && (
              <div
                className={`absolute z-50 bottom-8 bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-0.5 min-w-[160px] ${isMine ? "right-0" : "left-0"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => onConfirmDelete(message.id, false)} className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700">
                  Benden Sil
                </button>
                <button
                  disabled={message.senderId !== currentUserId}
                  onClick={() => onConfirmDelete(message.id, true)}
                  className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Herkes İçin Sil
                </button>
                <button onClick={onCancelDelete} className="text-left text-xs px-3 py-1 text-gray-400 hover:text-gray-600">
                  İptal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Timestamp + ticks */}
        <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
          {isMine && (
            message.readAt ? (
              <svg className="w-[14px] h-[14px] text-blue-400" viewBox="0 0 20 12" fill="none">
                <path d="M1 6L5.5 10.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6L10.5 10.5L19 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg className="w-[14px] h-[14px] text-gray-400" viewBox="0 0 20 12" fill="none">
                <path d="M1 6L5.5 10.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6L10.5 10.5L19 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export function MessengerChatBox({
  otherUser,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  conversationId,
  onClose,
  onFirstMessageSent,
}: MessengerChatBoxProps) {
  const {
    messages,
    typingUserIds,
    isLoadingMessages,
    sendMessage,
    uploadImage,
    deleteMessage,
    startTyping,
    stopTyping,
    openConversation,
    closeConversation,
  } = useMessenger()

  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    openConversation(conversationId)
    return () => closeConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content || isSending) return
    const isFirstMessage = messages.length === 0
    setIsSending(true)
    setSendError(null)
    setText("")
    stopTyping()
    try {
      await sendMessage(content)
      if (isFirstMessage && onFirstMessageSent) {
        onFirstMessageSent()
      }
    } catch (err) {
      console.error("[MessengerChatBox] send error:", err)
      setText(content)
      setSendError("Mesaj gönderilemedi. Tekrar deneyin.")
    } finally {
      setIsSending(false)
    }
  }, [text, isSending, sendMessage, stopTyping, messages.length, onFirstMessageSent])

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

  const handleDeleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    setDeleteTarget(null)
    try {
      await deleteMessage(messageId, deleteForAll)
    } catch (err) {
      console.error("[MessengerChatBox] delete error:", err)
    }
  }, [deleteMessage])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadImage(file)
    } catch (err) {
      console.error("[MessengerChatBox] Image upload error:", err)
    } finally {
      e.target.value = ""
    }
  }

  const isOtherTyping = typingUserIds.includes(otherUser.id)

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <Avatar src={otherUser.avatarUrl} name={otherUser.name} size={40} />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{otherUser.name}</p>
          <p className="text-xs text-gray-400">Mesaj bırakabilirsiniz</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Kapat"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Avatar src={otherUser.avatarUrl} name={otherUser.name} size={56} />
            <p className="mt-3 font-semibold text-gray-900">{otherUser.name}</p>
            <p className="text-sm text-gray-400 mt-1">Mesaj göndererek sohbeti başlatın.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === currentUserId
            const prevMsg = messages[idx - 1]
            const nextMsg = messages[idx + 1]
            // Show avatar on LAST message of a group (WhatsApp/Instagram style)
            const isLastInGroup =
              nextMsg?.senderId !== msg.senderId ||
              !nextMsg ||
              nextMsg.messageType === "NOTIFICATION"
            // Show name label on FIRST message of a group
            const isFirstInGroup =
              !prevMsg ||
              prevMsg.senderId !== msg.senderId ||
              prevMsg.messageType === "NOTIFICATION"

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMine={isMine}
                showAvatar={!isMine && isLastInGroup}
                showAvatarMine={isMine && isLastInGroup}
                isFirst={isFirstInGroup}
                isFirstMine={isFirstInGroup && isMine}
                otherUser={otherUser}
                currentUserName={currentUserName}
                currentUserAvatarUrl={currentUserAvatarUrl}
                currentUserId={currentUserId}
                isDeleteTarget={deleteTarget === msg.id}
                onRequestDelete={(id) => setDeleteTarget(deleteTarget === id ? null : id)}
                onConfirmDelete={handleDeleteMessage}
                onCancelDelete={() => setDeleteTarget(null)}
              />
            )
          })
        )}

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex items-end gap-2">
            <Avatar src={otherUser.avatarUrl} name={otherUser.name} size={28} />
            <div className="bg-gray-100 rounded-[22px] rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ───────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-gray-200 bg-white">
        {sendError && (
          <p className="text-xs text-red-500 px-1 pb-1">{sendError}</p>
        )}
        <div className="flex items-end gap-2 bg-gray-50 rounded-[28px] px-3 py-2 border border-gray-300 focus-within:border-amber-400 transition-colors">
          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors flex-shrink-0 mb-0.5"
            aria-label="Fotoğraf gönder"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
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

          {/* Text input */}
          <textarea
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
            disabled={!text.trim() || isSending}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5
              disabled:text-gray-300 disabled:cursor-not-allowed
              enabled:text-amber-500 enabled:hover:bg-amber-50"
            aria-label="Gönder"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
