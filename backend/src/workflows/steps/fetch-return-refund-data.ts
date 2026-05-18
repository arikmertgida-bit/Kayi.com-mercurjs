import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RETURN_SHIPMENT_MODULE } from "../../modules/return-shipment/index.js"
import ReturnShipmentService from "../../modules/return-shipment/service.js"
import type { ApprovedReturnItem } from "../../modules/return-shipment/models/return-shipment.js"

const COMMISSION_MODULE_KEY = "commission"

export interface FetchReturnRefundDataInput {
  return_shipment_id: string
  order_return_request_id: string
}

export interface ReturnRefundData {
  return_shipment_id: string
  approved_items: ApprovedReturnItem[]
  order: {
    id: string
    currency_code: string
    items: Array<{ id: string; unit_price: number; quantity: number; [key: string]: unknown }>
    seller_id: string
  }
  commission_percentage: number
}

export const fetchReturnRefundDataStep = createStep(
  "fetch-return-refund-data",
  async (input: FetchReturnRefundDataInput, { container }) => {
    const returnShipmentService: ReturnShipmentService = container.resolve(RETURN_SHIPMENT_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const [shipment] = await returnShipmentService.listReturnShipments({ id: input.return_shipment_id })
    if (!shipment) {
      throw new Error(`ReturnShipment not found: ${input.return_shipment_id}`)
    }

    const approvedItems = (shipment.approved_items ?? []) as unknown as ApprovedReturnItem[]

    const { data: returnRequests } = await query.graph({
      entity: "order_return_request",
      fields: ["id", "order.*", "order.items.*", "order.seller.*"],
      filters: { id: input.order_return_request_id },
    })

    if (!returnRequests.length) {
      throw new Error(`OrderReturnRequest not found: ${input.order_return_request_id}`)
    }

    const returnRequest = (returnRequests[0] as unknown) as {
      order: {
        id: string
        currency_code: string
        seller_id: string
        items: Array<{ id: string; unit_price: number; quantity: number; [key: string]: unknown }>
        seller: { id: string } | null
      }
    }

    const sellerId = returnRequest.order?.seller?.id ?? returnRequest.order?.seller_id
    let commissionPercentage = 0

    if (sellerId) {
      try {
        const commissionService = container.resolve<{
          listCommissionRules: (filters: Record<string, unknown>) => Promise<Array<{
            is_active: boolean
            rate?: { percentage_rate: number | null } | null
          }>>
        }>(COMMISSION_MODULE_KEY)

        const rules = await commissionService.listCommissionRules({
          reference: "seller",
          reference_id: sellerId,
          is_active: true,
        })

        if (rules.length > 0) {
          commissionPercentage = rules[0].rate?.percentage_rate ?? 0
        }
      } catch {
        // Commission module not available — continue with 0%
      }
    }

    const data: ReturnRefundData = {
      return_shipment_id: input.return_shipment_id,
      approved_items: approvedItems,
      order: {
        id: returnRequest.order.id,
        currency_code: returnRequest.order.currency_code,
        items: returnRequest.order.items ?? [],
        seller_id: sellerId ?? "",
      },
      commission_percentage: commissionPercentage,
    }

    return new StepResponse(data)
  }
)
