import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { ReturnRefundData } from "./fetch-return-refund-data.js"

export interface RefundBreakdown {
  order_id: string
  seller_id: string
  currency_code: string
  total_refund_amount: number
  commission_amount: number
  vendor_payout: number
  line_breakdown: Array<{ line_item_id: string; amount: number }>
}

export const calculateRefundBreakdownStep = createStep(
  "calculate-refund-breakdown",
  async (data: ReturnRefundData) => {
    const orderItemMap = new Map(data.order.items.map((item) => [item.id, item]))

    const lineBreakdown: Array<{ line_item_id: string; amount: number }> = []
    let totalRefundAmount = 0

    for (const approvedItem of data.approved_items) {
      const orderItem = orderItemMap.get(approvedItem.line_item_id)
      if (!orderItem) continue

      const amount = orderItem.unit_price * approvedItem.quantity
      lineBreakdown.push({ line_item_id: approvedItem.line_item_id, amount })
      totalRefundAmount += amount
    }

    const commissionAmount = Math.floor(totalRefundAmount * (data.commission_percentage / 100))
    const vendorPayout = totalRefundAmount - commissionAmount

    const breakdown: RefundBreakdown = {
      order_id: data.order.id,
      seller_id: data.order.seller_id,
      currency_code: data.order.currency_code,
      total_refund_amount: totalRefundAmount,
      commission_amount: commissionAmount,
      vendor_payout: vendorPayout,
      line_breakdown: lineBreakdown,
    }

    return new StepResponse(breakdown)
  }
)
