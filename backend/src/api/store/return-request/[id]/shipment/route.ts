import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RETURN_SHIPMENT_MODULE } from "../../../../../modules/return-shipment/index.js"
import ReturnShipmentService from "../../../../../modules/return-shipment/service.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const returnShipmentService: ReturnShipmentService = req.scope.resolve(RETURN_SHIPMENT_MODULE)

  const shipments = await returnShipmentService.listReturnShipments({
    order_return_request_id: id,
  })

  if (!shipments.length) {
    return res.status(404).json({ message: "Bu iade talebi için kargo kaydı bulunamadı." })
  }

  const { phase, tracking_number, carrier, shipped_at, received_at } = shipments[0]

  return res.json({
    return_shipment: { phase, tracking_number, carrier, shipped_at, received_at },
  })
}
