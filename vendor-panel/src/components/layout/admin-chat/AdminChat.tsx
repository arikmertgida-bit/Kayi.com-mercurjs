import { ChatBubble } from "@medusajs/icons"
import { Button, Drawer, Heading } from "@medusajs/ui"
import { useMe } from "../../../hooks/api"
import { MessengerChat } from "../messenger-chat/MessengerChat"
import { useMessengerAdminUnreads } from "../../../providers/messenger-provider/MessengerProvider"

export const AdminChat = () => {
  const { seller, isPending } = useMe()
  const unreads = useMessengerAdminUnreads()
  const unreadCount = unreads.length

  if (isPending)
    return <div className="w-16" />

  if (!seller) return null

  return (
    <Drawer>
      <Drawer.Trigger asChild>
        <Button
          variant="transparent"
          size="small"
          className="relative flex items-center gap-1.5 text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          <ChatBubble className="w-4 h-4" />
          <span className="text-xs font-medium">Support</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>Chat with Admin</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto p-0 flex flex-col">
          <MessengerChat currentUserId={seller.id ?? ""} />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
