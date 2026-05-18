import { model } from "@medusajs/framework/utils"

export interface ApprovedReturnItem {
  line_item_id: string
  quantity: number
}

const ReturnShipment = model.define("return_shipment", {
  id: model.id().primaryKey(),
  order_return_request_id: model.text().index("idx_return_shipment_return_request_id"),
  phase: model
    .enum(["awaiting_shipment", "in_transit", "received"])
    .default("awaiting_shipment")
    .index("idx_return_shipment_phase"),
  tracking_number: model.text().nullable(),
  carrier: model.text().nullable(),
  approved_by: model.text(),
  approved_at: model.dateTime(),
  shipped_at: model.dateTime().nullable(),
  received_at: model.dateTime().nullable(),
  approved_items: model.json().nullable(),
})

export default ReturnShipment
