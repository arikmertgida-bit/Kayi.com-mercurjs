import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SellerAccountRequestUpdatedEvent } from "@mercurjs/framework"

const SELLER_MODULE_KEY = "seller"

/**
 * Minimal interface covering only the generated updateSellers method we need.
 * MedusaService generates update<Entity>s for every registered model.
 */
interface ISellerModuleService {
  updateSellers(
    data: Array<{ id: string; photo?: string | null }>
  ): Promise<unknown[]>
}

/**
 * When a seller creation request is accepted, assigns a default profile photo
 * to the seller if they have not already uploaded one.
 *
 * The default asset (defaults/seller-default-avatar.svg) is uploaded to MinIO
 * at container startup via ensure-default-assets.js.
 */
export default async function assignDefaultImagesOnSellerAccepted({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const requestId = event.data?.id
  if (!requestId) {
    logger.warn("assign-default-images: no request id in event data")
    return
  }

  // Resolve request → seller_id
  const { data: requests } = await query.graph({
    entity: "request",
    fields: ["id", "status", "data"],
    filters: { id: requestId },
  })

  const request = requests?.[0]
  if (!request) {
    logger.warn(`assign-default-images: request ${requestId} not found`)
    return
  }

  const sellerId = (request.data as Record<string, unknown>)?.seller_id as
    | string
    | undefined
  if (!sellerId) {
    logger.warn(
      `assign-default-images: no seller_id in request.data for request ${requestId}`
    )
    return
  }

  // Check current seller photo
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "photo"],
    filters: { id: sellerId },
  })

  const seller = sellers?.[0]
  if (!seller) {
    logger.warn(`assign-default-images: seller ${sellerId} not found`)
    return
  }

  const currentPhoto = (seller as { id: string; photo: string | null | undefined }).photo
  if (currentPhoto) {
    logger.info(
      `assign-default-images: seller ${sellerId} already has a photo — skipping`
    )
    return
  }

  // Build the default photo URL from MinIO env vars
  const minioPublicUrl =
    process.env.MINIO_PUBLIC_URL ?? "http://localhost:9002"
  const bucket = process.env.MINIO_BUCKET ?? "medusa-media"
  const defaultPhotoUrl = `${minioPublicUrl}/${bucket}/defaults/seller-default-avatar.svg`

  const sellerService =
    container.resolve<ISellerModuleService>(SELLER_MODULE_KEY)

  await sellerService.updateSellers([{ id: sellerId, photo: defaultPhotoUrl }])

  logger.info(
    `assign-default-images: assigned default photo to seller ${sellerId}: ${defaultPhotoUrl}`
  )
}

export const config: SubscriberConfig = {
  event: SellerAccountRequestUpdatedEvent.ACCEPTED,
  context: {
    subscriberId: "assign-default-images-on-seller-accepted-handler",
  },
}
