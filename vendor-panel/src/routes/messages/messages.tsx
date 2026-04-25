import { Container } from "@medusajs/ui"
import { useMe } from "../../hooks/api"
import { MessengerVendorInbox } from "./components/MessengerVendorInbox"

export const Messages = () => {
  const { seller } = useMe()

  if (!seller) return null

  return (
    <Container className="divide-y p-0 min-h-[700px]">
      <MessengerVendorInbox sellerId={seller.id} sellerName={seller.name} />
    </Container>
  )
}
