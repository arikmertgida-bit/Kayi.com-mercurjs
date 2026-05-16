import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, PromotionStatus } from "@medusajs/framework/utils"
import { CreatePromotionDTO, IEventBusModuleService, IPromotionModuleService, PromotionDTO } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import {
  SellerWithMeta,
  buildMetaWithSeller,
  buildNamespacedCode,
  stripNamespaceFromCode,
} from "../../../lib/promotion-types.js"

/** Shape of a row returned from the seller_promotion link table. */
type SellerPromotionLinkRow = { promotion_id: string }

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  // Satıcıya ait tüm promotion ID'lerini link tablosundan al (sayfalama yok).
  // is_automatic filtresi sonradan uygulandığı için önce tümünü çekiyoruz.
  const { data: allLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, deleted_at: { $eq: null } },
  })

  const allPromotionIds = (allLinks as SellerPromotionLinkRow[]).map((r) => r.promotion_id)

  if (allPromotionIds.length === 0) {
    return res.json({ promotions: [], count: 0, limit, offset })
  }

  // is_automatic: false → kampanya tarafından oluşturulan otomatik promosyonları gizle.
  //
  // İki paralel DB sorgusu — her ikisi de DB seviyesinde filtreliyor:
  // (1) count: bu satıcıya ait toplam is_automatic:false promosyon sayısı
  // (2) page: skip/take ile DB'den doğrudan sayfalanmış çıktı + tam ilişkiler
  // Not: link tablosu sorgusu kaçınılmaz — is_automatic sütunu link tablosunda yok;
  //      satıcıya ait ID'leri almak için link tablosuna gidilmesi gerekiyor.
  const [countResult, pagePromotions] = await Promise.all([
    promotionService.listPromotions(
      { id: allPromotionIds, is_automatic: false } as Parameters<typeof promotionService.listPromotions>[0],
      { select: ["id"] }
    ),
    promotionService.listPromotions(
      { id: allPromotionIds, is_automatic: false } as Parameters<typeof promotionService.listPromotions>[0],
      { relations: ["application_method", "rules"], skip: offset, take: limit }
    ),
  ])

  const count = countResult.length

  if (pagePromotions.length === 0) {
    return res.json({ promotions: [], count, limit, offset })
  }

  // Merge metadata from the raw jsonb column (ORM entity does not include it).
  const metaRows: { id: string; metadata: Record<string, unknown> | null }[] =
    await knex("promotion").select("id", "metadata").whereIn("id", pagePromotions.map((p) => p.id))
  const metaMap = new Map(metaRows.map((r) => [r.id, r.metadata]))
  const promotionsWithMeta = pagePromotions.map((p) => ({
    ...p,
    metadata: metaMap.get(p.id) ?? null,
  }))

  return res.json({ promotions: promotionsWithMeta, count, limit, offset })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    ["id", "metadata"]
  ) as SellerWithMeta
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  // req.body is validated by MedusaJS route middleware to match CreatePromotionDTO shape.
  const body = req.body as CreatePromotionDTO & { metadata?: unknown; code?: string }

  const applicationMethod = body.application_method
  if (applicationMethod?.target_type === "shipping_methods") {
    return res.status(400).json({
      message: "Promotions targeting shipping methods are not supported for vendors.",
    })
  }

  // Adım 1: is_automatic güvenlik engeli — computeActions() satıcı sınırı tanımaz.
  if (body.is_automatic === true) {
    return res.status(400).json({
      message: "Satıcı promosyonları otomatik olamaz. is_automatic false olarak ayarlayın.",
    })
  }

  // Adım 2: Çakışma kontrolü — hedeflenen ürünler herhangi bir kampanya veya
  // başka bir promosyon kodunda kullanılıyor mu?
  //
  // Tek DB sorgusu + O(n) Set lookup:
  //   - Önceki 2 ayrı listPromotions (is_automatic:true ve is_automatic:false) yerine
  //     tek bir sorgu ile tüm mevcut promosyonlar çekilir.
  //   - Ürün ID'leri Set'e atılır, çakışma O(1) lookup ile tespit edilir.
  //   - İki aşamalı nested loop (O(n×m)) yerine O(n) tek geçiş.
  {
    type TargetRuleShape = { attribute?: string; values?: unknown[] }
    type AppMethodShape = { target_rules?: TargetRuleShape[] }
    type PromoShape = { application_method?: AppMethodShape; is_automatic?: boolean }

    const incomingTargetRules: TargetRuleShape[] =
      ((body.application_method as AppMethodShape | undefined)?.target_rules) ?? []

    const incomingProductIds = incomingTargetRules
      .filter((r) => r.attribute === "items.product.id")
      .flatMap((r) => {
        const vals = r.values ?? []
        return vals.map((v) =>
          typeof v === "string" ? v : (v as { value?: string } | null)?.value
        )
      })
      .filter((v): v is string => typeof v === "string" && v.length > 0)

    if (incomingProductIds.length > 0) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

      const { data: promoLinks } = await query.graph({
        entity: sellerPromotion.entryPoint,
        fields: ["promotion_id"],
        filters: { seller_id: seller.id, deleted_at: { $eq: null } },
      })

      const existingPromoIds = (promoLinks as SellerPromotionLinkRow[]).map((r) => r.promotion_id)

      if (existingPromoIds.length > 0) {
        // Tek sorgu — is_automatic filtresi yok: hem kampanya hem manuel promosyonlar alınır.
        const allExistingPromos = await promotionService.listPromotions(
          { id: existingPromoIds } as Parameters<typeof promotionService.listPromotions>[0],
          {
            relations: [
              "application_method",
              "application_method.target_rules",
              "application_method.target_rules.values",
            ],
          }
        )

        // Tüm mevcut promosyonların hedef ürün ID'lerini tek Set'e yükle — O(n) geçiş.
        // Set lookup O(1): nested find() döngüsünün O(n×m) karmaşıklığını ortadan kaldırır.
        const occupiedProductIds = new Map<string, PromoShape>()
        for (const promo of allExistingPromos) {
          const targetRules = (promo as PromoShape).application_method?.target_rules ?? []
          for (const rule of targetRules) {
            if (rule.attribute === "items.product.id") {
              for (const v of rule.values ?? []) {
                const pid = typeof v === "string" ? v : (v as { value?: string })?.value
                if (pid && !occupiedProductIds.has(pid)) {
                  occupiedProductIds.set(pid, promo as PromoShape)
                }
              }
            }
          }
        }

        const conflictId = incomingProductIds.find((pid) => occupiedProductIds.has(pid))
        if (conflictId) {
          const productService = req.scope.resolve<{
            listProducts: (filter: { id: string[] }) => Promise<Array<{ title?: string }>>
          }>(Modules.PRODUCT)
          let productName = conflictId
          try {
            const [product] = await productService.listProducts({ id: [conflictId] })
            if (product?.title) productName = product.title
          } catch {
            // product name unavailable — use id
          }
          const conflictingPromo = occupiedProductIds.get(conflictId)
          const isCampaignBased = conflictingPromo?.is_automatic === true
          return res.status(400).json({
            message: isCampaignBased
              ? `${productName} adlı ürün bir kampanyaya dahil edilmiş olduğundan promosyon kodu oluşturulamaz.`
              : `${productName} adlı ürüne promosyon kodu tanımlıdır. Aynı ürün için yeni bir promosyon kodu oluşturulamaz.`,
          })
        }
      }
    }
  }

  // Adım 3: Kodu seller-namespaced formata çevir.
  const namespacedCode = body.code ? buildNamespacedCode(body.code, seller.id) : body.code

  // Set the MedusaJS status field to mirror the approval decision.
  // Pending vendors → inactive so that computeActions() cannot apply the promo.
  // Trusted/auto-publish vendors → active immediately.
  const autoPublish = seller.metadata?.auto_publish_promotions === true

  // Cast the input (not the return) so the single-DTO overload resolves correctly:
  // createPromotions(data: CreatePromotionDTO): Promise<PromotionDTO>
  const promoInput = Object.assign({} as CreatePromotionDTO, body, {
    code: namespacedCode,
    status: autoPublish ? PromotionStatus.ACTIVE : PromotionStatus.INACTIVE,
  }) as CreatePromotionDTO

  const promotion = await promotionService.createPromotions(promoInput)

  // Raw knex: write seller ownership metadata to the promotion.metadata jsonb column.
  // MedusaJS promotion ORM entity does not support metadata; we added the column manually.
  //
  // ATOMICITY SCOPE: both the metadata write and the link creation are wrapped in a
  // single try/catch that compensates by deleting the just-created promotion.
  // This guarantees no orphan promotion (no metadata + no link = invisible to seller
  // but treated as platform-scoped at checkout) can exist after a partial failure.
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const metaPayload = buildMetaWithSeller(body.metadata, seller.id, seller.metadata ?? null)

  try {
    await knex("promotion")
      .where({ id: promotion.id })
      .update({
        metadata: knex.raw(
          `COALESCE(metadata, '{}'::jsonb) || ?::jsonb`,
          [JSON.stringify(metaPayload)]
        ),
      })

    await remoteLink.create([
      {
        seller: { seller_id: seller.id },
        [Modules.PROMOTION]: { promotion_id: promotion.id },
      },
    ])
  } catch (writeOrLinkError) {
    // Compensate: delete the orphaned promotion so neither the vendor nor the
    // checkout can encounter it in an inconsistent state.
    // The cleanup error is intentionally silenced — the original error is what propagates.
    await promotionService.deletePromotions(promotion.id).catch(() => {})
    throw writeOrLinkError
  }

  // Trusted vendor (autoPublish = true): the promotion is already ACTIVE, so
  // emit the broadcast event immediately. Standard vendors go through admin
  // approval, which fires the same event when approved.
  if (autoPublish) {
    try {
      const eventBus = req.scope.resolve<IEventBusModuleService>(Modules.EVENT_BUS)
      await eventBus.emit({
        name: "seller.promotion_approved",
        data: {
          promotion_id: promotion.id,
          seller_id: seller.id,
          promotion_code: promotion.code ?? "",
        },
      })
    } catch {
      // Non-fatal: broadcast failure does not roll back the promotion creation.
    }
  }

  return res.status(201).json({
    promotion,
    display_code: promotion.code
      ? stripNamespaceFromCode(promotion.code, seller.id)
      : null,
  })
}
