"use client"

import { Session } from "@talkjs/react"
import { MessageButton } from "./MessageButton"

interface SessionWrapperProps {
  appId: string
  userId: string
}

/**
 * Isolates TalkJS Session to only wrap MessageButton.
 * Previously Session wrapped the entire layout (Header + children + Footer),
 * blocking Time-to-Interactive for the whole page while TalkJS initialised.
 * Now only MessageButton is gated behind TalkJS — the rest of the page
 * hydrates and becomes clickable immediately.
 */
export function SessionWrapper({ appId, userId }: SessionWrapperProps) {
  return (
    <Session appId={appId} userId={userId}>
      <MessageButton />
    </Session>
  )
}
