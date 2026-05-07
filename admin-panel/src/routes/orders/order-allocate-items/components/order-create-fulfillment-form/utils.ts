import {
  AdminOrderLineItem,
  AdminProductVariant,
  AdminProductVariantInventoryItemLink,
  OrderLineItemDTO,
} from "@medusajs/types"

/**
 * Check if the line item has inventory kit.
 */
export function checkInventoryKit(
  item: AdminOrderLineItem | OrderLineItemDTO
) {
  const variant = (item as AdminOrderLineItem & { variant?: AdminProductVariant & { inventory_items?: AdminProductVariantInventoryItemLink[] } }).variant

  if (!variant) {
    return false
  }

  return (
    (!!variant.inventory_items?.length && variant.inventory_items.length > 1) ||
    (variant.inventory_items?.length === 1 &&
      (variant.inventory_items[0].required_quantity ?? 0) > 1)
  )
}
