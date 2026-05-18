import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { RETURN_SHIPMENT_MODULE } from "../../../../../modules/return-shipment/index.js"
import ReturnShipmentService from "../../../../../modules/return-shipment/service.js"

const ApprovedItemSchema = z.object({
  line_item_id: z.string().min(1),
  quantity: z.number().int().positive(),
})

const ApproveReturnRequestSchema = z.object({
  carrier: z.string().min(1).optional(),
  approved_items: z.array(ApprovedItemSchema).min(1).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const parseResult = ApproveReturnRequestSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ message: "Geçersiz istek verisi.", errors: parseResult.error.flatten() })
  }

  const { carrier, approved_items } = parseResult.data

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: returnRequests } = await query.graph({
    entity: "order_return_request",
    fields: ["id", "status", "line_items.*"],
    filters: { id },
  })

  if (!returnRequests.length) {
    return res.status(404).json({ message: "İade talebi bulunamadı." })
  }

  const returnRequest = returnRequests[0] as {
    id: string
    status: string
    line_items: Array<{ line_item_id: string; quantity: number }>
  }

  if (returnRequest.status !== "pending") {
    return res.status(422).json({ message: "Yalnızca bekleyen iade talepleri onaylanabilir." })
  }

  if (approved_items && approved_items.length > 0) {
    const requestedMap = new Map<string, number>(
      returnRequest.line_items.map((li) => [li.line_item_id, li.quantity])
    )

    for (const item of approved_items) {
      const requestedQty = requestedMap.get(item.line_item_id)
      if (requestedQty === undefined) {
        return res.status(422).json({
          message: `line_item_id '${item.line_item_id}' bu iade talebine ait değil.`,
        })
      }
      if (item.quantity > requestedQty) {
        return res.status(422).json({
          message: `Onaylanan miktar (${item.quantity}), talep edilen miktarı (${requestedQty}) aşamaz.`,
        })
      }
    }
  }

  const returnShipmentService: ReturnShipmentService = req.scope.resolve(RETURN_SHIPMENT_MODULE)

  const existing = await returnShipmentService.listReturnShipments({ order_return_request_id: id })
  if (existing.length > 0) {
    return res.status(422).json({ message: "Bu iade talebi zaten onaylanmış." })
  }

  const actorId = (req as MedusaRequest & { auth_context?: { actor_id: string } }).auth_context?.actor_id ?? ""

  const resolvedItems =
    approved_items && approved_items.length > 0
      ? approved_items
      : returnRequest.line_items.map((li) => ({ line_item_id: li.line_item_id, quantity: li.quantity }))

  const shipment = await returnShipmentService.createReturnShipments({
    order_return_request_id: id,
    phase: "awaiting_shipment",
    carrier: carrier ?? null,
    approved_by: actorId,
    approved_at: new Date(),
    approved_items: resolvedItems as unknown as Record<string, unknown>,
  })

  return res.json({ return_shipment: shipment })
}

