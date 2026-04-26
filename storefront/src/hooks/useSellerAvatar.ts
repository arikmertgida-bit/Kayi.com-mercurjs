"use client"

import { useRef, useState, useEffect } from "react"

interface SellerAvatarInfo {
  avatarUrl: string | null
  displayName: string | null
}

/**
 * Module-level cache — persists across component mounts/unmounts within the session.
 * Prevents duplicate API calls when multiple ConversationListItems request
 * the same seller simultaneously.
 */
const avatarCache = new Map<string, SellerAvatarInfo>()

const EMPTY: SellerAvatarInfo = { avatarUrl: null, displayName: null }

/**
 * Fetches a seller's avatar URL and display name by their member ID (mem_...).
 * Returns immediately from cache if available; otherwise fetches once and caches.
 *
 * Used by MessengerInbox to display seller photos in the conversation list.
 */
export function useSellerAvatar(memberId: string | undefined): SellerAvatarInfo {
  const [info, setInfo] = useState<SellerAvatarInfo>(() => {
    if (memberId && avatarCache.has(memberId)) return avatarCache.get(memberId)!
    return EMPTY
  })

  const fetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!memberId) return
    fetchedRef.current.add(memberId)

    fetch(`/api/seller-avatar/${encodeURIComponent(memberId)}`)
      .then((r) => r.json())
      .then((data: SellerAvatarInfo) => {
        avatarCache.set(memberId, data)
        setInfo(data)
      })
      .catch(() => {
        // Remove from in-flight set so a future mount can retry
        fetchedRef.current.delete(memberId)
      })
  }, [memberId])

  return info
}
