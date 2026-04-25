"use client"

import { useState } from "react"
import Image from "next/image"
import { useMessenger } from "@/providers/MessengerProvider"
import { MessengerChatBox } from "@/components/cells/MessengerChatBox/MessengerChatBox"
import type { Conversation } from "@/lib/messenger/types"

interface ConversationListItemProps {
  conversation: Conversation
  currentUserId: string
  isActive: boolean
  onClick: () => void
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Az önce"
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa`
  const days = Math.floor(hours / 24)
  return `${days} g`
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.33 }}
    >
      {initials}
    </div>
  )
}

function ConversationListItem({
  conversation,
  currentUserId,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== currentUserId
  )
  const myParticipant = conversation.participants.find(
    (p) => p.userId === currentUserId
  )
  const lastMessage = conversation.messages[0]
  const unreadCount = myParticipant?.unreadCount ?? 0
  const otherName = otherParticipant?.displayName ?? otherParticipant?.userId ?? "Bilinmiyor"

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
        isActive ? "bg-blue-50" : ""
      }`}
    >
      <div className="relative">
        <Avatar name={otherName} size={48} />
        {/* Online dot placeholder */}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm ${unreadCount > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"} truncate`}>
            {conversation.subject ?? otherName}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
            {lastMessage
              ? lastMessage.messageType === "IMAGE"
                ? "📷 Fotoğraf"
                : lastMessage.content
              : "Henüz mesaj yok"}
          </span>
          {unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

interface MessengerInboxProps {
  currentUserId: string
  currentUserName: string
}

export function MessengerInbox({ currentUserId, currentUserName }: MessengerInboxProps) {
  const {
    conversations,
    activeConversationId,
    openConversation,
    closeConversation,
    refreshConversations,
  } = useMessenger()

  const [searchQuery, setSearchQuery] = useState("")

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true
    const subject = c.subject?.toLowerCase() ?? ""
    const other = c.participants.find((p) => p.userId !== currentUserId)
    const name = (other?.displayName ?? other?.userId ?? "").toLowerCase()
    const q = searchQuery.toLowerCase()
    return subject.includes(q) || name.includes(q)
  })

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const otherParticipant = activeConversation?.participants.find(
    (p) => p.userId !== currentUserId
  )

  return (
    <div className="flex h-full bg-white rounded-2xl overflow-hidden border border-gray-100">
      {/* ── Conversation List ────────────────────────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold text-gray-900">Mesajlar</h2>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Mesajlarda ara"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-full"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
              <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm text-gray-400">
                {searchQuery ? "Sonuç bulunamadı" : "Henüz mesajınız yok"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                currentUserId={currentUserId}
                isActive={conv.id === activeConversationId}
                onClick={() => openConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {activeConversationId && otherParticipant ? (
          <MessengerChatBox
            conversationId={activeConversationId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            otherUser={{
              id: otherParticipant.userId,
              name: otherParticipant.displayName ?? otherParticipant.userId,
              userType: otherParticipant.userType,
            }}
            onClose={closeConversation}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Mesajlarınız</h3>
            <p className="text-sm text-gray-400 max-w-[280px]">
              Satıcılarla özel mesajlaşmak için soldaki bir konuşmayı seçin.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
