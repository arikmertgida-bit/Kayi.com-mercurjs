import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerOrder from "@mercurjs/b2c-core/links/seller-order"
import { notifyMessengerUser } from "../lib/messenger.js"


/**
 * Promotion broadcast payload — emitted by admin approve route.
 */
interface PromotionApprovedPayload {
  promotion_id: string
  seller_id: string
  promotion_code: string
}

/**
 * Runtime shape of a promotion with the relations we need.
 */
interface PromotionFull {
  id: string
  code?: string | null
  application_method?: {
    type?: string | null
    value?: number | null
    target_rules?: Array<{
      attribute?: string | null
      values?: Array<{ value?: string | null }>
    }> | null
  } | null
  campaign?: {
    name?: string | null
  } | null
}

/**
 * DB row returned from knex("order").select("customer_id")
 */
interface OrderRow {
  customer_id: string | null
}

/**
 * Seller entity with enriched member list from the query graph.
 */
interface SellerWithMembers {
  id: string
  name?: string | null
  handle?: string | null
  members?: Array<{ id: string }>
}

const BATCH_SIZE = 10
const MAX_RECIPIENTS = 500
const ORDER_CHUNK_SIZE = 500

/**
 * Chunks an array into sub-arrays of the given size.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

/**
 * POST /admin/promotions/:id/approve → seller.promotion_approved
 *
 * Sends a PROMOTION-type DIRECT message to every customer who has previously
 * placed an order with this seller (max 500 recipients per broadcast).
 *
 * Design principles:
 * - Non-fatal: a single failed notification never aborts the rest of the batch.
 * - Batch size 10: keeps kayi-messenger connection pressure manageable.
 * - Max 500 recipients: safe initial limit; raise when async queue is in place.
 */
export default async function promotionFollowerBroadcastSubscriber({
  event: { data },
  container,
}: SubscriberArgs<PromotionApprovedPayload>) {
  const { promotion_id, seller_id } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!seller_id || !promotion_id) {
    logger.warn("[promotion-broadcast] Missing seller_id or promotion_id — skipping")
    return
  }

  const linkQuery = container.resolve(ContainerRegistrationKeys.QUERY)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

  // ── 1. Resolve seller name, handle, and member IDs ───────────────────────
  let sellerName = "Satıcı"
  let sellerHandle: string | null = null
  let sellerMemberId: string | null = null

  try {
    const { data: sellerRows } = await linkQuery.graph({
      entity: "seller",
      fields: ["id", "name", "handle", "members.id"],
      filters: { id: seller_id },
    })
    const seller = sellerRows[0] as unknown as SellerWithMembers | undefined
    sellerName = seller?.name ?? "Satıcı"
    sellerHandle = seller?.handle ?? null
    const memberIds = (seller?.members ?? [])
      .map((m) => m.id)
      .filter((id) => id.startsWith("mem_"))
    sellerMemberId = memberIds[0] ?? null
  } catch (err: unknown) {
    logger.warn(
      `[promotion-broadcast] Could not resolve seller info for ${seller_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // ── 2. Resolve promotion details (discount + campaign + target products) ──
  let displayCode = data.promotion_code ?? ""
  let discountValue: number | null = null
  let discountType: string | null = null
  let campaignName: string | null = null
  let productIds: string[] = []

  try {
    const promotions = (await promotionService.listPromotions(
      { id: [promotion_id] },
      {
        relations: [
          "application_method",
          "application_method.target_rules",
          "application_method.target_rules.values",
          "campaign",
        ],
      }
    )) as unknown as PromotionFull[]

    const promotion = promotions[0]
    if (promotion) {
      displayCode = promotion.code ?? displayCode
      discountValue = promotion.application_method?.value ?? null
      discountType = promotion.application_method?.type ?? null
      campaignName = promotion.campaign?.name ?? null

      const targetRules = promotion.application_method?.target_rules ?? []
      for (const rule of targetRules) {
        if (rule.attribute === "items.product.id") {
          const vals = (rule.values ?? [])
            .map((v) => v.value)
            .filter((v): v is string => typeof v === "string")
          productIds = vals
        }
      }
    }
  } catch (err: unknown) {
    logger.warn(
      `[promotion-broadcast] Could not resolve promotion details for ${promotion_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // ── 3. Enrich all target products (title + thumbnail + handle) ─────────────
  type ProductRow = { id: string; title: string; thumbnail: string | null; handle: string | null }
  let products: ProductRow[] = []

  if (productIds.length > 0) {
    try {
      products = await knex("product")
        .select("id", "title", "thumbnail", "handle")
        .whereIn("id", productIds)
    } catch (err: unknown) {
      logger.warn(
        `[promotion-broadcast] Could not enrich products: ` +
          (err instanceof Error ? err.message : String(err))
      )
    }
  }

  // ── 4. Build customer recipient list from seller's orders ─────────────────
  let customerIds: string[] = []

  try {
    // Step 4a: get all order IDs for this seller via the link table
    const { data: orderLinks } = await linkQuery.graph({
      entity: sellerOrder.entryPoint,
      fields: ["order_id"],
      filters: { seller_id, deleted_at: { $eq: null } },
    })
    const orderIds = (orderLinks as Array<{ order_id: string }>)
      .map((l) => l.order_id)
      .filter(Boolean)

    if (orderIds.length > 0) {
      // Step 4b: chunk large order lists to avoid massive WHERE IN
      const idSet = new Set<string>()
      for (const orderChunk of chunk(orderIds, ORDER_CHUNK_SIZE)) {
        const rows: OrderRow[] = await knex("order")
          .select("customer_id")
          .whereIn("id", orderChunk)
          .whereNotNull("customer_id")
          .distinct("customer_id")
        for (const row of rows) {
          if (row.customer_id) idSet.add(row.customer_id)
        }
      }
      customerIds = [...idSet]
    }
  } catch (err: unknown) {
    logger.warn(
      `[promotion-broadcast] Could not resolve customer list for seller ${seller_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // Cap at MAX_RECIPIENTS for the initial phase
  const recipients = customerIds.slice(0, MAX_RECIPIENTS)

  if (recipients.length === 0) {
    logger.info(
      `[promotion-broadcast] No customers to notify for seller ${seller_id} — skipping`
    )
    return
  }

  // ── 5. Build notification content ─────────────────────────────────────────
  const discountStr =
    discountType === "percentage" && discountValue != null
      ? `%${discountValue}`
      : discountType === "fixed" && discountValue != null
        ? `₺${discountValue}`
        : "indirim"

  const contentText = `${sellerName} mağazasında yeni promosyon: ${discountStr} indirim! Kod: ${displayCode}`

  const metadataPayload: Record<string, unknown> = {
    type: "promotion_broadcast",
    promotion_id,
    sellerName,
    sellerHandle,
    promotionCode: displayCode,
    discountValue,
    discountType,
    campaignName,
    products,
  }

  // ── 6. Send in batches of BATCH_SIZE ──────────────────────────────────────
  logger.info(
    `[promotion-broadcast] Sending to ${recipients.length} customers for promotion ${promotion_id}`
  )

  for (const batchChunk of chunk(recipients, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batchChunk.map((customerId) =>
        notifyMessengerUser({
          targetUserId: customerId,
          targetUserType: "CUSTOMER",
          ...(sellerMemberId
            ? { sourceUserId: sellerMemberId, sourceUserType: "SELLER" }
            : {}),
          senderName: sellerName,
          preview: contentText,
          subject: `${sellerName} — Yeni Promosyon`,
          conversationType: "DIRECT",
          notificationType: "promotion_broadcast",
          messageType: "PROMOTION",
          metadata: metadataPayload,
        })
      )
    )

    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        logger.warn(
          `[promotion-broadcast] Failed to notify customer ${batchChunk[i]}: ` +
            (result.reason instanceof Error
              ? result.reason.message
              : String(result.reason))
        )
      }
    }
  }

  logger.info(
    `[promotion-broadcast] Broadcast complete for promotion ${promotion_id} — ` +
      `${recipients.length} recipients targeted`
  )

  // ── 7. Recipient count'u promotion metadata'ya kaydet ─────────────────────
  // Raw knex ile yaz — MedusaJS promotion ORM entity metadata desteklemiyor;
  // kolonu manuel olarak ekledik (ALTER TABLE promotion ADD COLUMN metadata jsonb).
  try {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await knex("promotion")
      .where({ id: promotion_id })
      .update({
        metadata: knex.raw(
          `COALESCE(metadata, '{}'::jsonb) || ?::jsonb`,
          [JSON.stringify({
            broadcast_recipient_count: recipients.length,
            broadcast_sent_at: new Date().toISOString(),
          })]
        ),
      })
    logger.info(
      `[promotion-broadcast] Saved recipient count (${recipients.length}) to promotion metadata for ${promotion_id}`
    )
  } catch (err: unknown) {
    logger.warn(
      `[promotion-broadcast] Failed to save recipient count to promotion metadata: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }
}

export const config: SubscriberConfig = {
  event: "seller.promotion_approved",
  context: {
    subscriberId: "promotion-follower-broadcast",
  },
}
