import { Module } from "@medusajs/framework/utils"
import ReturnShipmentService from "./service"

export const RETURN_SHIPMENT_MODULE = "returnShipment"

export default Module(RETURN_SHIPMENT_MODULE, {
  service: ReturnShipmentService,
})
