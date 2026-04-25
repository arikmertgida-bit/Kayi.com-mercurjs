"use client"

import { MessageButton } from "./MessageButton"

// SessionWrapper — TalkJS removed. MessengerProvider is now in layout.tsx.
// Props kept for backwards compatibility but ignored.
export function SessionWrapper(_props: { appId?: string; userId?: string }) {
  return <MessageButton />
}
