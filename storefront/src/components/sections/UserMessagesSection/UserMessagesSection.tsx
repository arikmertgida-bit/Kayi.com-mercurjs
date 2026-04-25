"use client"

import { MessengerInbox } from "@/components/sections/MessengerInbox/MessengerInbox"

interface UserMessagesSectionProps {
  currentUserId: string
  currentUserName: string
}

export const UserMessagesSection = ({ currentUserId, currentUserName }: UserMessagesSectionProps) => {
  return (
    <div className="max-w-full h-[655px]">
      <MessengerInbox currentUserId={currentUserId} currentUserName={currentUserName} />
    </div>
  )
}
