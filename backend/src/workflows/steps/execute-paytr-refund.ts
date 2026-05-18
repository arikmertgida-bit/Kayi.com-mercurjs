import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RETURN_SHIPMENT_MODULE } from "../../modules/return-shipment/index.js"
import ReturnShipmentService from "../../modules/return-shipment/service.js"
import type { RefundBreakdown } from "./calculate-refund-breakdown.js"

export interface ExecutePayTrRefundInput {
  return_shipment_id: string
  breakdown: RefundBreakdown
}

export const executePayTrRefundStep = createStep(
  "execute-paytr-refund",
  async (input: ExecutePayTrRefundInput, { container }) => {
    const logger = container.resolve<{
      info: (msg: string) => void
      warn: (msg: string) => void
      error: (msg: string) => void
    }>(ContainerRegistrationKeys.LOGGER)

    const { breakdown, return_shipment_id } = input
    const isPayTrActive = process.env.PAYTR_ACTIVE === "true"

    if (!isPayTrActive) {
      logger.warn(
        `[process-return-refund] PayTR entegrasyonu aktif değil. İade dökümü loglanıyor:\n` +
        `  return_shipment_id: ${return_shipment_id}\n` +
        `  order_id:           ${breakdown.order_id}\n` +
        `  seller_id:          ${breakdown.seller_id}\n` +
        `  currency:           ${breakdown.currency_code}\n` +
        `  total_refund:       ${breakdown.total_refund_amount}\n` +
        `  commission:         ${breakdown.commission_amount}\n` +
        `  vendor_payout:      ${breakdown.vendor_payout}\n` +
        `  lines: ${JSON.stringify(breakdown.line_breakdown)}`
      )
      return new StepResponse(null, return_shipment_id)
    }

    // PayTR Marketplace Refund API
    const merchantId = process.env.PAYTR_MERCHANT_ID ?? ""
    const merchantKey = process.env.PAYTR_MERCHANT_KEY ?? ""
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT ?? ""
    const endpoint = process.env.PAYTR_ENDPOINT ?? "https://www.paytr.com/odeme/iade"

    if (!merchantId || !merchantKey || !merchantSalt) {
      logger.error("[process-return-refund] PayTR ortam değişkenleri eksik. İade işlemi atlandı.")
      return new StepResponse(null, return_shipment_id)
    }

    // Build HMAC token: merchant_id + order_id + return_amount + merchant_salt
    const crypto = await import("node:crypto")
    const tokenData = `${merchantId}${breakdown.order_id}${breakdown.total_refund_amount}${merchantSalt}`
    const paytrToken = crypto
      .createHmac("sha256", merchantKey)
      .update(tokenData)
      .digest("base64")

    const body = new URLSearchParams({
      merchant_id: merchantId,
      merchant_oid: breakdown.order_id,
      return_amount: String(breakdown.total_refund_amount),
      paytr_token: paytrToken,
    })

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })

    const result = (await response.json()) as { status: string; err_no?: number; err_msg?: string }

    if (result.status !== "success") {
      throw new Error(`PayTR iade başarısız: ${result.err_msg ?? "bilinmeyen hata"} (${result.err_no ?? -1})`)
    }

    logger.info(
      `[process-return-refund] PayTR iade başarılı — order_id: ${breakdown.order_id}, ` +
      `tutar: ${breakdown.total_refund_amount} ${breakdown.currency_code}`
    )

    return new StepResponse(result, return_shipment_id)
  },
  async (returnShipmentId: string | null | undefined, { container }) => {
    if (!returnShipmentId) return

    const logger = container.resolve<{
      warn: (msg: string) => void
    }>(ContainerRegistrationKeys.LOGGER)

    try {
      const returnShipmentService: ReturnShipmentService = container.resolve(RETURN_SHIPMENT_MODULE)
      await returnShipmentService.updateReturnShipments({
        id: returnShipmentId,
        phase: "in_transit",
        received_at: null,
      })
      logger.warn(
        `[process-return-refund] Kompanzasyon: ${returnShipmentId} id'li kargo fazı 'in_transit' olarak geri alındı.`
      )
    } catch (err) {
      logger.warn(
        `[process-return-refund] Kompanzasyon başarısız — ${returnShipmentId}: ${String(err)}`
      )
    }
  }
)
