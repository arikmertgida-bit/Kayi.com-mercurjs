import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService, Logger, UpdatePromotionDTO } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import {
  PromotionWithMeta,
  SellerWithMeta,
  buildMetaWithSeller,
  buildNamespacedCode,
  stripNamespaceFromCode,
} from "../../shared/promotion-types.js"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, promotion_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  const promotion = await promotionService.retrievePromotion(id, {
    relations: ["application_method", "rules", "campaign"],
  })

  return res.json({ promotion })
}

export const PUT = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    ["id", "metadata"]
  ) as SellerWithMeta

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, promotion_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  // req.body is validated by MedusaJS route middleware to match UpdatePromotionDTO shape.
  const body = req.body as UpdatePromotionDTO & { metadata?: unknown; code?: string }

  const applicationMethod = body.application_method
  if (applicationMethod?.target_type === "shipping_methods") {
    return res.status(400).json({
      message: "Promotions targeting shipping methods are not supported for vendors.",
    })
  }

  // Adım 2: Güncelleme sırasında da kodu seller-namespaced formata çevir.
  const namespacedCode = body.code ? buildNamespacedCode(body.code, seller.id) : body.code

  const promotion = await promotionService.updatePromotions(
    Object.assign({} as UpdatePromotionDTO, body, {
      id,
      code: namespacedCode,
      metadata: buildMetaWithSeller(body.metadata, seller.id, seller.metadata ?? null),
    })
  ) as PromotionWithMeta

  return res.json({
    promotion,
    display_code: promotion.code
      ? stripNamespaceFromCode(promotion.code, seller.id)
      : null,
  })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, promotion_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  // Inline Step/Compensate saga — garantili atomik silme:
  // Step 1: Entity soft-delete. Başarısız olursa link dokunulmaz → güvenli fırlatma.
  await promotionService.deletePromotions(id)

  // Step 2: Link kaydını temizle.
  // Compensation: dismiss başarısız olursa soft-delete geri alınır (restorePromotions).
  try {
    await remoteLink.dismiss([
      {
        seller: { seller_id: seller.id },
        [Modules.PROMOTION]: { promotion_id: id },
      },
    ])
  } catch (linkError) {
    try {
      await promotionService.restorePromotions(id)
      logger.warn(
        `[vendor/promotions/delete] Compensated — promotion ${id} restored after link dismiss failure`
      )
    } catch (restoreError) {
      logger.warn(
        `[vendor/promotions/delete] COMPENSATION FAILED: promotion ${id} stuck deleted — manual intervention required. linkError: ${String(linkError)} restoreError: ${String(restoreError)}`
      )
    }
    throw linkError
  }

  return res.status(200).json({ id, object: "promotion", deleted: true })
}
