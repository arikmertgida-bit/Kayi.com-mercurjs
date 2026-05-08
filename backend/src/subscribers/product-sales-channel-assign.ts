import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { assignProductToDefaultChannelWorkflow } from "../workflows/assign-product-to-default-channel"

/**
 * Fires on requests.product.accepted — emitted by MercurJS after an admin
 * (or the auto-approve subscriber) accepts a vendor product request.
 *
 * At this point the product status has already been set to "published" by
 * acceptProductRequestWorkflow. We assign the product to the store's default
 * sales channel so it becomes visible on the storefront.
 *
 * The workflow is idempotent — already-linked products are silently skipped.
 * throwOnError is false so a channel-assignment failure never crashes the
 * request-acceptance flow.
 */
export default async function productSalesChannelAssignSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const requestId = data.id

  const { data: requests } = await query.graph({
    entity: "request",
    fields: ["id", "data"],
    filters: { id: requestId },
  })

  const request = requests?.[0]

  if (!request) {
    logger.warn(
      `product-sales-channel-assign: request ${requestId} not found, skipping`
    )
    return
  }

  const productId = (request.data as Record<string, unknown>)?.product_id as
    | string
    | undefined

  if (!productId) {
    logger.warn(
      `product-sales-channel-assign: request ${requestId} has no product_id in data, skipping`
    )
    return
  }

  logger.info(
    `product-sales-channel-assign: assigning product ${productId} to default sales channel`
  )

  await assignProductToDefaultChannelWorkflow(container).run({
    input: { product_id: productId },
    throwOnError: false,
  })
}

export const config: SubscriberConfig = {
  event: "requests.product.accepted",
  context: {
    subscriberId: "product-sales-channel-assign",
  },
}
