import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RETURN_SHIPMENT_MODULE } from "../../../../../modules/return-shipment/index.js"
import ReturnShipmentService from "../../../../../modules/return-shipment/service.js"
import { processReturnRefundWorkflow } from "../../../../../workflows/process-return-refund.js"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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

  if (shipment.phase !== "in_transit") {
    return res.status(422).json({ message: "Kargo durumu güncellenemiyor: beklenen aşama 'in_transit'." })
  }

  const updated = await returnShipmentService.updateReturnShipments({
    id: shipment.id,
    phase: "received",
    received_at: new Date(),
  })

  // Trigger PayTR refund workflow (env-guarded — runs even when PayTR is inactive)
  await processReturnRefundWorkflow.run({
    container: req.scope,
    input: {
      return_shipment_id: shipment.id,
      order_return_request_id: id,
    },
  })

  return res.json({ return_shipment: updated })
}
