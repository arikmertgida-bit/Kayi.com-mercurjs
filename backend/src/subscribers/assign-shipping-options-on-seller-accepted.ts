import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SellerAccountRequestUpdatedEvent } from "@mercurjs/framework"

/**
 * When a seller creation request is accepted, automatically links all global
 * admin-managed shipping options to the new seller.
 *
 * This is required because MercurJS's filterSellerShippingOptionsStep only
 * returns shipping options that are linked to a seller via
 * seller_seller_fulfillment_shipping_option.
 */
export default async function assignShippingOptionsOnSellerAccepted({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const requestId = event.data?.id
  if (!requestId) {
    logger.warn("assign-shipping-options: no request id in event data")
    return
  }

  const { data: requests } = await query.graph({
    entity: "request",
    fields: ["id", "status", "data"],
    filters: { id: requestId },
  })

  const request = requests?.[0]
  if (!request) {
    logger.warn(`assign-shipping-options: request ${requestId} not found`)
    return
  }

  const sellerId = (request.data as any)?.seller_id
  if (!sellerId) {
    logger.warn(
      `assign-shipping-options: no seller_id in request.data for request ${requestId}`
    )
    return
  }

  // Find which shipping options this seller already has
  const { data: existingLinks } = await query.graph({
    entity: "seller_shipping_option",
    fields: ["shipping_option_id"],
    filters: { seller_id: sellerId },
  })

  const alreadyLinked = new Set(
    (existingLinks ?? []).map((o: any) => o.shipping_option_id)
  )

  // Get all store-enabled shipping options (admin-managed global options)
  const { data: allShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  })

  const toLink = (allShippingOptions ?? []).filter(
    (so: any) => !alreadyLinked.has(so.id)
  )

  if (toLink.length === 0) {
    logger.info(
      `assign-shipping-options: seller ${sellerId} already has all shipping options`
    )
    return
  }

  await remoteLink.create(
    toLink.map((so: any) => ({
      seller: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { shipping_option_id: so.id },
    }))
  )

  logger.info(
    `assign-shipping-options: linked ${toLink.length} shipping option(s) to seller ${sellerId}: ${toLink.map((o: any) => o.name).join(", ")}`
  )
}

export const config: SubscriberConfig = {
  event: SellerAccountRequestUpdatedEvent.ACCEPTED,
  context: {
    subscriberId: "assign-shipping-options-on-seller-accepted-handler",
  },
}
