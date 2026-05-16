import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { fetchQuery } from "../../../lib/client"
import type { Message } from "../../../lib/messenger/types"

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
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

interface MessengerChatProps {
  /** Seller's own id */
  currentUserId: string
  /** Optional: override the other party's display name */
  otherName?: string
}

/**
 * Chat panel rendered inside the "Support" drawer in the vendor panel header.
 * On mount it fetches the real admin user ID from the backend and opens (or creates)
 * the admin-support conversation automatically.
 * The floating bottom-right button has been removed — the Drawer handles visibility.
 */
export function MessengerChat({
  currentUserId,
  otherName = "Destek",
}: MessengerChatProps) {
  const {
    conversations,
    pinnedMessages,
    typingUserIds,
    isLoadingMessages,
    sendSidebarMessage,
    uploadSidebarImage,
    deleteSidebarMessage,
    startTyping,
    stopTyping,
    openSidebarConversation,
    startConversation,
  } = useMessenger()

  const [text, setText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [localConvId, setLocalConvId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteMenuPos, setDeleteMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ messageId: string; deleteForAll: boolean } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)
  const { i18n, t } = useTranslation()

  // ── On mount: fetch admin ID + open existing conversation (no auto-create) ──
  // Conversation is created lazily in handleSend so that merely opening the drawer
  // does NOT create an empty entry in the admin panel's messages list.
  useEffect(() => {
    if (initializedRef.current || !currentUserId) return
    initializedRef.current = true

    fetchQuery("/vendor/support/admin-contact", { method: "GET" })
      .then(async (data: any) => {
        const aid = data?.adminUserId
        if (!aid) throw new Error("No admin user found")
        setAdminUserId(aid)
        // Open existing ADMIN_SUPPORT conversation if one already exists.
        // Do NOT call startConversation here — that would push an empty conversation
        // into admin’s /messages before any message has been typed.
        const existing = conversations.find((c: any) => c.type === "ADMIN_SUPPORT")
        if (existing) {
          setLocalConvId(existing.id)
          await openSidebarConversation(existing.id)
        }
      })
      .catch((err) => {
        console.error(err)
        // Allow retry on next drawer open
        initializedRef.current = false
      })
      .finally(() => setIsInitializing(false))
  }, [currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [pinnedMessages, typingUserIds])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    // Hard guard: never send empty content
    if (!content || isSending) return
    setIsSending(true)
    setText("")
    stopTyping()
    try {
      // Lazily create the ADMIN_SUPPORT conversation on the very first message.
      // This prevents an empty conversation from appearing in the admin panel
      // just because the vendor opened the Destek drawer.
      if (!localConvId) {
        if (!adminUserId) return
        const cid = await startConversation({
          targetUserId: adminUserId,
          targetUserType: "ADMIN",
          type: "ADMIN_SUPPORT",
          subject: "Satıcı Destek",
        })
        if (!cid) return
        setLocalConvId(cid)
        // Await openSidebarConversation so pinnedConvIdRef is updated
        // (it syncs from state on every render; the await getMessages inside
        // openSidebarConversation gives React time to commit the re-render).
        await openSidebarConversation(cid)
      }
      await sendSidebarMessage(content)
    } finally {
      setIsSending(false)
    }
  }, [text, isSending, localConvId, adminUserId, sendSidebarMessage, startConversation, openSidebarConversation, stopTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    startTyping()
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => stopTyping(), 3000)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadSidebarImage(file, async () => {
        if (localConvId) return localConvId
        if (!adminUserId) throw new Error("Admin user not found")
        const cid = await startConversation({
          targetUserId: adminUserId,
          targetUserType: "ADMIN",
          type: "ADMIN_SUPPORT",
          subject: "Satıcı Destek",
        })
        setLocalConvId(cid)
        await openSidebarConversation(cid)
        return cid
      })
    } finally {
      e.target.value = ""
    }
  }

  const isOtherTyping = typingUserIds.length > 0
  const myMessages = pinnedMessages.filter((m) => m.senderType === "SELLER")
  const lastMyMessageId = myMessages[myMessages.length - 1]?.id

  const handleDeleteMessage = useCallback(
    async (messageId: string, deleteForAll: boolean) => {
      try {
        await deleteSidebarMessage(messageId, deleteForAll)
      } catch (err) {
        console.error("[MessengerChat] delete error:", err)
      }
      setPendingDelete(null)
    },
    [deleteSidebarMessage]
  )

  const handleRequestDelete = useCallback(
    (messageId: string, deleteForAll: boolean) => {
      setDeleteTarget(null)
      setDeleteMenuPos(null)
      setPendingDelete({ messageId, deleteForAll })
    },
    []
  )

  if (isInitializing && pinnedMessages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pinnedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <p className="text-sm text-gray-400">
              Destek ekibimizle mesajlaşabilirsiniz.
            </p>
          </div>
        ) : (
          pinnedMessages.map((msg: Message) => {
            const isMine = msg.senderType === "SELLER"
            const isNotification = msg.messageType === "NOTIFICATION"
            const isLastMine = msg.id === lastMyMessageId

            if (isNotification) {
              const hasUrl = /https?:\/\//.test(msg.content)
              const renderContent = (): React.ReactNode => {
                if (!hasUrl) return msg.content
                const urlRegex = /https?:\/\/[^\s]+/g
                const parts = msg.content.split(urlRegex)
                const urls = msg.content.match(urlRegex) ?? []
                return parts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {urls[i] && (
                      <a
                        href={urls[i]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-ui-fg-interactive hover:opacity-80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Promosyonu Görüntüle →
                      </a>
                    )}
                  </span>
                ))
              }
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <span className={`text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base ${hasUrl ? "rounded-xl px-4 py-2 max-w-[85%] text-center block" : "rounded-full px-3 py-1"}`}>
                    {renderContent()}
                  </span>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                    isMine
                      ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                      : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                  }${msg.deletedForAll ? " italic opacity-70" : ""}`}
                >
                  {!isMine && (
                    <p className="text-xs font-medium mb-1 opacity-70">{otherName}</p>
                  )}
                  {msg.messageType === "IMAGE" && msg.imageUrl ? (
                    <img src={msg.imageUrl} alt="Görsel" className="max-w-full rounded-lg" />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 opacity-60 text-right ${
                      isMine ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                    }`}
                  >
                    {formatTime(msg.createdAt, i18n.language)}
                    {isMine && isLastMine && msg.readAt && (
                      <span className="ml-1">· Görüldü</span>
                    )}
                  </p>
                  {/* Delete button */}
                  {!msg.deletedForAll && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (deleteTarget === msg.id) {
                          setDeleteTarget(null)
                          setDeleteMenuPos(null)
                        } else {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          setDeleteMenuPos(
                            isMine
                              ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                              : { top: rect.bottom + 4, left: rect.left }
                          )
                          setDeleteTarget(msg.id)
                        }
                      }}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-ui-bg-base/80 shadow text-ui-fg-muted hover:text-ui-fg-base opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}

        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl px-3 py-2">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2 bg-gray-50 rounded-[20px] px-3 py-2 border border-gray-200 focus-within:border-blue-400 transition-colors">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0 mb-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yaz..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-5 max-h-20 overflow-y-auto"
            style={{ minHeight: "20px" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 mb-0.5 transition-all disabled:text-gray-300 enabled:text-blue-500 enabled:hover:bg-blue-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    {/* Delete message dropdown */}
    {deleteTarget && deleteMenuPos && (
      <>
        <div className="fixed inset-0 z-[9998]" onClick={() => { setDeleteTarget(null); setDeleteMenuPos(null) }} />
        <div
          style={{
            position: "fixed",
            top: deleteMenuPos.top,
            ...(deleteMenuPos.right !== undefined ? { right: deleteMenuPos.right } : { left: deleteMenuPos.left }),
            zIndex: 9999,
          }}
          className="bg-ui-bg-overlay rounded-xl shadow-elevation-modal border border-ui-border-base p-1.5 flex flex-col gap-0.5 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleRequestDelete(deleteTarget, false)} className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors">
            {t("messages.deleteOnlyForMe")}
          </button>
          <button
            disabled={pinnedMessages.find((m) => m.id === deleteTarget)?.senderType !== "SELLER"}
            onClick={() => handleRequestDelete(deleteTarget, true)}
            className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-ui-tag-red-bg text-ui-tag-red-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t("messages.deleteForEveryone")}
          </button>
          <button onClick={() => { setDeleteTarget(null); setDeleteMenuPos(null) }} className="text-left text-xs px-3 py-1 text-ui-fg-muted hover:text-ui-fg-base transition-colors">
            {t("messages.close")}
          </button>
        </div>
      </>
    )}

    {/* Delete confirmation dialog */}
    {pendingDelete && (
      <>
        <div className="fixed inset-0 z-[10000] bg-black/40" onClick={() => setPendingDelete(null)} />
        <div className="fixed z-[10001] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-ui-bg-base rounded-xl shadow-elevation-modal border border-ui-border-base p-6 w-full max-w-sm">
          <p className="text-sm font-semibold text-ui-fg-base mb-2">{t("messages.deleteConfirmTitle")}</p>
          <p className="text-sm text-ui-fg-subtle mb-6">{t("messages.deleteConfirmDesc")}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 text-sm rounded-lg border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors"
            >
              {t("messages.close")}
            </button>
            <button
              onClick={() => handleDeleteMessage(pendingDelete.messageId, pendingDelete.deleteForAll)}
              className="px-4 py-2 text-sm rounded-lg bg-ui-tag-red-bg hover:opacity-90 text-ui-tag-red-text font-medium transition-opacity"
            >
              {t("messages.delete")}
            </button>
          </div>
        </div>
      </>
    )}
  </>
  )
}
