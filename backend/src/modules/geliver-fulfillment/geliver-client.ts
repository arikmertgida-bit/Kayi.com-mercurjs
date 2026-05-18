// Geliver Fulfillment Provider — Custom HTTP client
// API docs: https://docs.geliver.io
// SDK ref:  https://github.com/GeliverApp/geliver-js (ESM-only; used as reference, not installed)

const BASE_URL = "https://api.geliver.io/api/v1"
const TIMEOUT_MS = 30_000
const MAX_RETRIES = 2
/** Delay ms before retry attempt n (1-based). 1s → 2s */
const retryDelayMs = (attempt: number) => attempt * 1_000

// ─── Options ──────────────────────────────────────────────────────────────────

export interface GéliverOptions {
  /** Geliver API token from https://app.geliver.io/apitokens */
  token?: string
  /** Pre-created sender address ID from Geliver panel */
  senderAddressId?: string
  /** Set to "true" to use test mode (Geliver Test carrier, 0 TL) */
  isTest?: string
  /** Your store URL sent as sourceIdentifier, e.g. "https://kayi.com" */
  sourceIdentifier?: string
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface RecipientAddress {
  name: string
  phone: string
  address1: string
  countryCode: string
  cityName: string
  cityCode?: string
  districtName?: string
  zip?: string
}

interface CreateTransactionParams {
  senderAddressId: string
  recipientAddress: RecipientAddress
  orderNumber: string
  totalAmount?: string
  merchantCode?: string
  isTest: boolean
  sourceIdentifier: string
  length?: string
  width?: string
  height?: string
  weight?: string
}

export interface GéliverShipmentData {
  id: string
  trackingNumber?: string
  trackingUrl?: string
  labelURL?: string
  barcode?: string
}

export interface GéliverTransactionResult {
  id: string
  shipment?: GéliverShipmentData
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class GéliverClient {
  readonly isMock: boolean
  private readonly token: string

  constructor(options: GéliverOptions) {
    this.token = options.token ?? ""
    this.isMock = !options.token
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let lastError: Error = new Error("Geliver request never attempted")

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Back-off before retry (not on first attempt)
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)))
      }

      let res: Response
      try {
        res = await this.fetchWithTimeout(`${BASE_URL}${path}`, {
          method,
          headers: this.authHeaders,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        })
      } catch (fetchErr) {
        // Network error / timeout — retry
        lastError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr))
        continue
      }

      // Retry on 429 (rate limit) and 5xx (server errors)
      if (res.status === 429 || res.status >= 500) {
        let detail = `${res.status} ${res.statusText}`
        try {
          const errJson = (await res.json()) as { message?: string }
          if (errJson?.message) detail = `${detail} — ${errJson.message}`
        } catch { /* ignore */ }
        lastError = new Error(`[Geliver] ${method} ${path} failed: ${detail}`)
        continue
      }

      // All other 4xx errors — do NOT retry, fail immediately
      if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`
        try {
          const errJson = (await res.json()) as { message?: string; code?: string }
          if (errJson?.message) detail = `${detail} — ${errJson.message}`
        } catch { /* ignore */ }
        throw new Error(`[Geliver] ${method} ${path} failed: ${detail}`)
      }

      // Parse success response
      const json = (await res.json()) as { data?: T; result?: boolean; message?: string } | T

      // Check Geliver's envelope: { result: false, message: "..." }
      if (
        json &&
        typeof json === "object" &&
        "result" in (json as object) &&
        (json as { result?: boolean }).result === false
      ) {
        const msg = (json as { message?: string }).message ?? "Unknown error"
        throw new Error(`[Geliver] ${method} ${path} returned result=false: ${msg}`)
      }

      if (json && typeof json === "object" && "data" in (json as object)) {
        return (json as { data: T }).data
      }
      return json as T
    }

    throw lastError
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * One-step label purchase: POST /transactions with { shipment: {...} }
   * Geliver creates the shipment, selects the cheapest offer and purchases
   * the label in a single call. Returns the Transaction which contains the
   * updated Shipment (barcode, labelURL, trackingNumber when available).
   *
   * SDK equivalent: client.transactions.create(params)
   */
  async createTransaction(
    params: CreateTransactionParams
  ): Promise<GéliverTransactionResult> {
    if (this.isMock) {
      return {
        id: "mock-tx-id",
        shipment: {
          id: "mock-shipment-id",
          trackingNumber: "MOCK123456",
          trackingUrl: "https://geliver.io/track/MOCK123456",
          labelURL: "",
          barcode: "",
        },
      }
    }

    const body = {
      shipment: {
        senderAddressID: params.senderAddressId,
        test: params.isTest,
        recipientAddress: {
          name: params.recipientAddress.name,
          phone: params.recipientAddress.phone,
          address1: params.recipientAddress.address1,
          countryCode: params.recipientAddress.countryCode.toUpperCase(),
          cityName: params.recipientAddress.cityName,
          cityCode: params.recipientAddress.cityCode ?? "",
          districtName: params.recipientAddress.districtName ?? "",
          ...(params.recipientAddress.zip
            ? { zip: params.recipientAddress.zip }
            : {}),
        },
        length: params.length ?? "10.0",
        width: params.width ?? "10.0",
        height: params.height ?? "10.0",
        distanceUnit: "cm",
        weight: params.weight ?? "1.0",
        massUnit: "kg",
        order: {
          orderNumber: params.orderNumber,
          sourceIdentifier: params.sourceIdentifier,
          ...(params.totalAmount
            ? {
                totalAmount: params.totalAmount,
                totalAmountCurrency: "TRY",
              }
            : {}),
          ...(params.merchantCode
            ? { merchantCode: params.merchantCode }
            : {}),
        },
      },
    }

    return this.request<GéliverTransactionResult>("POST", "/transactions", body)
  }

  /**
   * Cancel a shipment: DELETE /shipments/:id
   *
   * SDK equivalent: client.shipments.cancel(shipmentId)
   */
  async cancelShipment(shipmentId: string): Promise<void> {
    if (this.isMock) return
    await this.request<unknown>(
      "DELETE",
      `/shipments/${encodeURIComponent(shipmentId)}`
    )
  }

  /**
   * Create return shipment AND purchase label immediately:
   * POST /shipments/:id  { isReturn: true, willAccept: true, count: 1 }
   *
   * SDK equivalent: client.transactions.createReturn(shipmentId, params)
   */
  async createReturnTransaction(
    shipmentId: string
  ): Promise<GéliverTransactionResult> {
    if (this.isMock) {
      return {
        id: "mock-return-tx-id",
        shipment: { id: "mock-return-shipment-id" },
      }
    }

    return this.request<GéliverTransactionResult>(
      "POST",
      `/shipments/${encodeURIComponent(shipmentId)}`,
      { isReturn: true, willAccept: true, count: 1 }
    )
  }
}
