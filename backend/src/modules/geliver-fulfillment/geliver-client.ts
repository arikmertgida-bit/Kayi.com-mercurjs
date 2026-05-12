export interface GéliverOptions {
  apiUrl?: string
  apiToken?: string
}

interface CreateShipmentParams {
  orderNumber: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientCity: string
  recipientDistrict: string
  recipientCountryCode: string
  weight?: string
  length?: string
  width?: string
  height?: string
}

interface GéliverShipment {
  id: string
  trackingNumber?: string
  trackingUrl?: string
}

const BASE_URL = "https://api.geliver.io/api/v1"

export class GéliverClient {
  private readonly isMock: boolean
  private readonly apiUrl: string
  private readonly apiToken: string

  constructor(options: GéliverOptions) {
    this.apiToken = options.apiToken ?? ""
    this.apiUrl = options.apiUrl ?? BASE_URL
    this.isMock = !options.apiToken
  }

  async createShipment(params: CreateShipmentParams): Promise<GéliverShipment> {
    if (this.isMock) {
      return {
        id: "mock-shipment-id",
        trackingNumber: "MOCK123456",
        trackingUrl: "https://geliver.io/track/MOCK123456",
      }
    }

    const body = {
      shipment: {
        recipientAddress: {
          name: params.recipientName,
          phone: params.recipientPhone,
          address1: params.recipientAddress,
          countryCode: params.recipientCountryCode,
          cityName: params.recipientCity,
          cityCode: "",
          districtName: params.recipientDistrict,
        },
        length: params.length ?? "10",
        width: params.width ?? "10",
        height: params.height ?? "10",
        distanceUnit: "cm",
        weight: params.weight ?? "1",
        massUnit: "kg",
        order: {
          orderNumber: params.orderNumber,
          sourceCode: "KAYI",
        },
      },
    }

    const res = await fetch(`${this.apiUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Geliver createShipment failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as { data?: { shipment?: GéliverShipment } }
    const shipment = json?.data?.shipment

    return {
      id: shipment?.id ?? "",
      trackingNumber: shipment?.trackingNumber,
      trackingUrl: shipment?.trackingUrl,
    }
  }

  async cancelShipment(shipmentId: string): Promise<{ id: string }> {
    if (this.isMock) {
      return { id: shipmentId }
    }

    const res = await fetch(`${this.apiUrl}/shipments/${encodeURIComponent(shipmentId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    })

    if (!res.ok) {
      throw new Error(`Geliver cancelShipment failed: ${res.status} ${res.statusText}`)
    }

    return { id: shipmentId }
  }

  async createReturnShipment(shipmentId: string): Promise<GéliverShipment> {
    if (this.isMock) {
      return { id: "mock-return-shipment-id" }
    }

    const res = await fetch(`${this.apiUrl}/shipments/${encodeURIComponent(shipmentId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isReturn: true, count: 1 }),
    })

    if (!res.ok) {
      throw new Error(`Geliver createReturnShipment failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as { data?: GéliverShipment }
    return {
      id: json?.data?.id ?? "return-shipment-id",
      trackingNumber: json?.data?.trackingNumber,
      trackingUrl: json?.data?.trackingUrl,
    }
  }
}
