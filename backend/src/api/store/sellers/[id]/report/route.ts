import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { notifyMessengerUser } from "../../../../../lib/messenger"

const reportSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(200, "Reason must be at most 200 characters"),
  comment: z.string().min(1, "Comment is required").max(1000, "Comment must be at most 1000 characters"),
})

const TABLE = "seller_report"

async function ensureReportTable(knex: any) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id   VARCHAR     NOT NULL,
      customer_id VARCHAR     NOT NULL,
      reason      VARCHAR     NOT NULL,
      comment     TEXT        NOT NULL,
      status      VARCHAR     NOT NULL DEFAULT 'pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TABLE}_seller_id_idx     ON ${TABLE} (seller_id);
    CREATE INDEX IF NOT EXISTS ${TABLE}_customer_id_idx   ON ${TABLE} (customer_id);
    CREATE INDEX IF NOT EXISTS ${TABLE}_status_idx        ON ${TABLE} (status);
  `)
}

/**
 * POST /store/sellers/:id/report
 * Report a seller. Requires authentication.
 * Duplicate reports (same customer + seller) are rejected with 409.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const sellerId = req.params.id

  const parsed = reportSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0].message })
  }

  const { reason, comment } = parsed.data

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Ensure seller exists and is not suspended / deleted
  const seller = await knex("seller")
    .select("id", "name")
    .where({ id: sellerId, deleted_at: null })
    .first()

  if (!seller) {
    return res.status(404).json({ message: "Seller not found." })
  }

  await ensureReportTable(knex)

  // Duplicate report check — one report per customer per seller
  const existing = await knex(TABLE)
    .where({ seller_id: sellerId, customer_id: customerId })
    .first()

  if (existing) {
    return res.status(409).json({ message: "You have already submitted a report for this seller." })
  }

  await knex(TABLE).insert({
    seller_id: sellerId,
    customer_id: customerId,
    reason,
    comment,
    status: "pending",
  })

  // Fire-and-forget: notify customer via kayi-messenger
  notifyMessengerUser({
    targetUserId: customerId,
    targetUserType: "CUSTOMER",
    senderName: "Kayı.com",
    preview: "Satıcı raporunuz alındı. En kısa sürede incelenecektir.",
    sourceUserId: "admin-system",
    sourceUserType: "ADMIN",
    subject: "Satıcı Raporu Alındı",
    conversationType: "ADMIN_SUPPORT",
    notificationType: "report_notification",
  })

  return res.status(201).json({ message: "Report submitted successfully." })
}
