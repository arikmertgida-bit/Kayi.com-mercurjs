"use client"

import { Badge } from "@/components/atoms"
import { MessageIcon } from "@/icons"
import LocalizedClientLink from "../LocalizedLink/LocalizedLink"
import { useMessengerUnreadCount } from "@/providers/MessengerProvider"

export const MessageButton = () => {
  const count = useMessengerUnreadCount()

  return (
    <LocalizedClientLink href="/user/messages" className="relative">
      <MessageIcon size={20} />
      {count > 0 && (
        <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0">
          {count}
        </Badge>
      )}
    </LocalizedClientLink>
  )
}
