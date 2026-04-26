"use client"

import { MessengerInbox } from "@/components/sections/MessengerInbox/MessengerInbox"

interface UserMessagesSectionProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatarUrl?: string | null
}

export const UserMessagesSection = ({ currentUserId, currentUserName, currentUserAvatarUrl }: UserMessagesSectionProps) => {
  return (
    <div className="max-w-full h-[655px]">
      <MessengerInbox currentUserId={currentUserId} currentUserName={currentUserName} currentUserAvatarUrl={currentUserAvatarUrl} />
    </div>
  )
}
