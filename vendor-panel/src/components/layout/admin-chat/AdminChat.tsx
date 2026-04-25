import { ChatBubble } from "@medusajs/icons"
import { Drawer, Heading, IconButton } from "@medusajs/ui"
import { useState } from "react"
import { useMe } from "../../../hooks/api"
import { MessengerChat } from "../messenger-chat/MessengerChat"

export const AdminChat = () => {
  const [open, setOpen] = useState(false)
  const { seller, isPending } = useMe()

  if (isPending)
    return <div className="flex justify-center items-center h-screen" />

  if (!seller) return null

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <IconButton
          variant="transparent"
          className="text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          <ChatBubble />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>Chat with admin</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto p-0">
          <MessengerChat currentUserId={seller.id ?? ""} />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
