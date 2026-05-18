import SellerModule from "@mercurjs/b2c-core/modules/seller"
import RegionModule from "@medusajs/medusa/region"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(SellerModule.linkable.seller, {
  linkable: RegionModule.linkable.region,
  isList: true,
})
