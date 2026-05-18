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
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/types"
import {
  GéliverClient,
  type GéliverOptions,
  type GéliverTransactionResult,
} from "./geliver-client.js"

export class GéliverFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "geliver"

  private readonly client: GéliverClient
  private readonly senderAddressId: string
  private readonly isTest: boolean
  private readonly sourceIdentifier: string
  private logger: Logger

  constructor(
    { logger }: { logger: Logger } & Record<string, unknown>,
    options: GéliverOptions
  ) {
    super()
    this.logger = logger
    this.senderAddressId = options.senderAddressId ?? ""
    this.isTest = options.isTest === "true"
    this.sourceIdentifier = options.sourceIdentifier ?? "https://kayi.com"
    this.client = new GéliverClient(options)
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      { id: "geliver-standard", name: "Geliver Standart Kargo" },
      { id: "geliver-express", name: "Geliver Hızlı Kargo" },
    ]
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
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
    const addr = order?.shipping_address
    const recipientName =
      [addr?.first_name, addr?.last_name].filter(Boolean).join(" ") || "Müşteri"

    let tx: GéliverTransactionResult
    try {
      tx = await this.client.createTransaction({
        senderAddressId: this.senderAddressId,
        recipientAddress: {
          name: recipientName,
          phone: addr?.phone ?? "",
          address1: addr?.address_1 ?? "",
          countryCode: addr?.country_code ?? "TR",
          cityName: addr?.city ?? "",
          cityCode: "",
          districtName: addr?.province ?? "",
        },
        orderNumber: order?.id ?? "unknown-order",
        totalAmount:
          order?.total != null ? String(order.total) : undefined,
        // merchantCode enables per-seller filtering on Geliver's dashboard
        merchantCode: (data.seller_id as string | undefined),
        isTest: this.isTest,
        sourceIdentifier: this.sourceIdentifier,
      })
    } catch (err) {
      this.logger.error(
        `[geliver] createFulfillment failed for order ${order?.id ?? "unknown"}: ${String(err)}`
      )
      throw err
    }

    const shipment = tx.shipment
    const labels: CreateFulfillmentResult["labels"] = shipment?.trackingNumber
      ? [
          {
            tracking_number: shipment.trackingNumber,
            tracking_url: shipment.trackingUrl ?? "",
            label_url: shipment.labelURL ?? "",
          },
        ]
      : []

    return {
      data: {
        ...data,
        geliver_transaction_id: tx.id,
        geliver_shipment_id: shipment?.id ?? "",
        tracking_number: shipment?.trackingNumber ?? "",
        tracking_url: shipment?.trackingUrl ?? "",
        label_url: shipment?.labelURL ?? "",
        barcode: shipment?.barcode ?? "",
      },
      labels,
    }
  }

  async cancelFulfillment(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const shipmentId = data.geliver_shipment_id as string | undefined
    if (shipmentId) {
      try {
        await this.client.cancelShipment(shipmentId)
      } catch (err) {
        this.logger.error(
          `[geliver] cancelFulfillment failed for shipment ${shipmentId}: ${String(err)}`
        )
        throw err
      }
    }
    return {}
  }

  async getFulfillmentDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    const shipmentId = (
      fulfillment?.data as Record<string, unknown> | undefined
    )?.geliver_shipment_id as string | undefined

    let returnTx: GéliverTransactionResult | undefined
    if (shipmentId) {
      try {
        returnTx = await this.client.createReturnTransaction(shipmentId)
      } catch (err) {
        this.logger.error(
          `[geliver] createReturnFulfillment failed for shipment ${shipmentId}: ${String(err)}`
        )
        throw err
      }
    }

    const returnShipment = returnTx?.shipment
    const labels: CreateFulfillmentResult["labels"] =
      returnShipment?.trackingNumber
        ? [
            {
              tracking_number: returnShipment.trackingNumber,
              tracking_url: returnShipment.trackingUrl ?? "",
              label_url: returnShipment.labelURL ?? "",
            },
          ]
        : []

    return {
      data: {
        geliver_transaction_id: returnTx?.id ?? "",
        geliver_shipment_id: returnShipment?.id ?? "",
        tracking_number: returnShipment?.trackingNumber ?? "",
        tracking_url: returnShipment?.trackingUrl ?? "",
        label_url: returnShipment?.labelURL ?? "",
      },
      labels,
    }
  }

  async getReturnDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async getShipmentDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  async retrieveDocuments(
    _fulfillmentData: Record<string, unknown>,
    _documentType: string
  ): Promise<void> {
    return
  }
}
