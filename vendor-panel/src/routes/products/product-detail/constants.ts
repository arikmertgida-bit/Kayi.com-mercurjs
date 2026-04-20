import { getLinkedFields } from "../../../extensions"

export const PRODUCT_DETAIL_FIELDS = getLinkedFields(
  "product",
  "title,status,handle,description,discountable,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels,*categories,*tags,*type,*collection,origin_country,material,weight,length,height,width,attribute_values.*,attribute_values.attribute.*"
)
