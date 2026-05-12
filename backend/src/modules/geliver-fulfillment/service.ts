import {
  AbstractFulfillmentProviderService,
} from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  ValidateFulfillmentDataContext,
} from "@medusajs/types"
import { GéliverClient, type GéliverOptions } from "./geliver-client.js"

export class GéliverFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "geliver"

  private client: GéliverClient

  constructor(_: Record<string, unknown>, options: GéliverOptions) {
    super()
    this.client = new GéliverClient(options)
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      { id: "geliver-standard", name: "Geliver Standart Kargo" },
      { id: "geliver-express", name: "Geliver Hızlı Kargo" },
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    return { ...data }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return !!data.id
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return false
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    _context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    return {
      calculated_amount: 0,
      is_calculated_price_tax_inclusive: false,
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    _fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const shippingAddress = order?.shipping_address

    const shipment = await this.client.createShipment({
      orderNumber: order?.id ?? "unknown-order",
      recipientName: [shippingAddress?.first_name, shippingAddress?.last_name]
        .filter(Boolean)
        .join(" ") || "Müşteri",
      recipientPhone: shippingAddress?.phone ?? "",
      recipientAddress: shippingAddress?.address_1 ?? "",
      recipientCity: shippingAddress?.city ?? "",
      recipientDistrict: shippingAddress?.province ?? "",
      recipientCountryCode: shippingAddress?.country_code ?? "TR",
    })

    const labels: CreateFulfillmentResult["labels"] = shipment.trackingNumber
      ? [
          {
            tracking_number: shipment.trackingNumber,
            tracking_url: shipment.trackingUrl ?? "",
            label_url: "",
          },
        ]
      : []

    return {
      data: {
        ...data,
        geliver_shipment_id: shipment.id,
        tracking_number: shipment.trackingNumber ?? "",
        tracking_url: shipment.trackingUrl ?? "",
      },
      labels,
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const shipmentId = data.geliver_shipment_id as string | undefined
    if (shipmentId) {
      await this.client.cancelShipment(shipmentId)
    }
    return {}
  }

  async getFulfillmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    const shipmentId = (fulfillment?.data as Record<string, unknown> | undefined)
      ?.geliver_shipment_id as string | undefined

    if (shipmentId) {
      await this.client.createReturnShipment(shipmentId)
    }

    return { data: {}, labels: [] }
  }

  async getReturnDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async getShipmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async retrieveDocuments(
    _fulfillmentData: Record<string, unknown>,
    _documentType: string
  ): Promise<void> {
    return
  }
}
