import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { RETURN_SHIPMENT_MODULE } from "../../../../../modules/return-shipment/index.js"
import ReturnShipmentService from "../../../../../modules/return-shipment/service.js"

const MarkShippedBackSchema = z.object({
  tracking_number: z.string().min(1).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const parseResult = MarkShippedBackSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ message: "Geçersiz istek verisi.", errors: parseResult.error.flatten() })
  }

  const { tracking_number } = parseResult.data

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Verify the return request exists
  const { data: returnRequests } = await query.graph({
    entity: "order_return_request",
    fields: ["id"],
    filters: { id },
  })

  if (!returnRequests.length) {
    return res.status(404).json({ message: "İade talebi bulunamadı." })
  }

  const returnShipmentService: ReturnShipmentService = req.scope.resolve(RETURN_SHIPMENT_MODULE)

  const shipments = await returnShipmentService.listReturnShipments({
    order_return_request_id: id,
  })

  if (!shipments.length) {
    return res.status(422).json({ message: "İade talebi henüz onaylanmamış." })
  }

  const shipment = shipments[0] as { id: string; phase: string }

  if (shipment.phase !== "awaiting_shipment") {
    return res.status(422).json({ message: "Kargo durumu güncellenemiyor: beklenen aşama 'awaiting_shipment'." })
  }

  const updated = await returnShipmentService.updateReturnShipments({
    id: shipment.id,
    phase: "in_transit",
    tracking_number: tracking_number ?? null,
    shipped_at: new Date(),
  })

  return res.json({ return_shipment: updated })
}
