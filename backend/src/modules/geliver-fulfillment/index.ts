import { Modules } from "@medusajs/framework/utils"
import { ModuleProvider } from "@medusajs/framework/utils"
import { GéliverFulfillmentService } from "./service.js"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [GéliverFulfillmentService],
})
