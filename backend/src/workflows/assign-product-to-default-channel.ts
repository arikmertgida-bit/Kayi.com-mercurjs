import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { assignToDefaultSalesChannelStep } from "./steps/assign-to-default-sales-channel"

type AssignProductToDefaultChannelInput = {
  product_id: string
}

/**
 * Workflow that assigns a single product to the store's default sales channel.
 * Idempotent — safe to call multiple times for the same product.
 */
export const assignProductToDefaultChannelWorkflow = createWorkflow(
  "assign-product-to-default-channel",
  (input: AssignProductToDefaultChannelInput) => {
    assignToDefaultSalesChannelStep({ product_id: input.product_id })
  }
)
