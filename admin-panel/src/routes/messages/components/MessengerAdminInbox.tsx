import { useEffect, useRef } from "react"

interface MessengerAdminInboxProps {
  adminId: string
}

/**
 * Embeds the kayi-messenger UI for the admin panel.
 * The iframe points to the messenger service's admin inbox endpoint.
 */
export const MessengerAdminInbox = ({ adminId }: MessengerAdminInboxProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const messengerUrl =
    (import.meta as any).env?.VITE_MESSENGER_URL || "http://localhost:4000"

  useEffect(() => {
    // Nothing to clean up — iframe handles its own lifecycle
  }, [adminId])

  return (
    <iframe
      ref={iframeRef}
      src={`${messengerUrl}/inbox?userId=${adminId}&userType=ADMIN`}
      title="Messenger Admin Inbox"
      className="w-full rounded-md border border-ui-border-base"
      style={{ height: "700px", minHeight: "400px" }}
      allow="clipboard-write"
    />
  )
}
