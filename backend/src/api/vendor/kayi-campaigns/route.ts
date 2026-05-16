import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import {
  SellerWithMeta,
  buildMetaWithSeller,
  buildNamespacedCode,
  buildNamespacedIdentifier,
} from "../../../lib/promotion-types.js"
import { createCampaignWithPromotionWorkflow } from "../../../workflows/create-campaign-with-promotion.js"

type CreateCampaignBody = {
  name: string
  starts_at?: string | null
  ends_at?: string | null
  discount_value: number
  product_ids: string[]
  metadata?: unknown
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    ["id", "metadata"]
  ) as SellerWithMeta

  const body = req.body as CreateCampaignBody

  // ─── Temel doğrulamalar ───────────────────────────────────────────────────
  if (typeof body.discount_value !== "number" || body.discount_value < 1 || body.discount_value > 100) {
    return res.status(400).json({ message: "İndirim oranı 1 ile 100 arasında olmalıdır." })
  }

  if (!Array.isArray(body.product_ids) || body.product_ids.length === 0) {
    return res.status(400).json({ message: "En az bir ürün seçmelisiniz." })
  }

  if (body.starts_at && new Date(body.starts_at) < new Date()) {
    return res.status(400).json({ message: "Başlangıç tarihi geçmişte olamaz." })
  }

  // ─── Workflow input hazırlama ─────────────────────────────────────────────
  const autoId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const sellerMeta = seller.metadata ?? null

  const workflowInput = {
    seller_id: seller.id,
    name: body.name,
    campaign_identifier: buildNamespacedIdentifier(autoId, seller.id),
    promotion_code: buildNamespacedCode(
      `CAMP${Date.now().toString(36).toUpperCase()}`,
      seller.id
    ),
    discount_value: body.discount_value,
    product_ids: body.product_ids,
    starts_at: body.starts_at != null ? new Date(body.starts_at) : undefined,
    ends_at: body.ends_at != null ? new Date(body.ends_at) : undefined,
    campaign_metadata: buildMetaWithSeller(body.metadata, seller.id, sellerMeta),
    promotion_metadata: buildMetaWithSeller(undefined, seller.id, sellerMeta),
  }

  // ─── Workflow çalıştır (otomatik atomicity + compensation) ───────────────
  let campaignId: string
  try {
    const { result } = await createCampaignWithPromotionWorkflow(req.scope).run({
      input: workflowInput,
    })
    campaignId = result.campaign_id
  } catch (err: unknown) {
    // MedusaError, runtime'da Error'ı extend etmez (instanceof Error = false).
    // Doğrudan message + __isMedusaError alanlarına sahip plain object olarak fırlatılır.
    let message = "Kampanya oluşturulamadı."
    if (err instanceof Error && err.message) {
      // Standart JS hatası
      message = err.message
    } else if (
      typeof err === "object" &&
      err !== null &&
      "__isMedusaError" in err &&
      "message" in err
    ) {
      // MedusaError — 3. parti lib sınırı: Error'ı extend etmez
      const msg = (err as { message: unknown }).message
      if (typeof msg === "string" && msg.length > 0) message = msg
    }
    return res.status(400).json({ message })
  }

  // ─── Oluşturulan kampanyayı çekip döndür ─────────────────────────────────
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const campaign = await promotionService.retrieveCampaign(campaignId, {
    relations: ["promotions"],
  })

  return res.status(201).json({ campaign })
}

