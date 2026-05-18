/**
 * POST /webhooks/geliver
 *
 * Receives Geliver shipment tracking updates.
 * Geliver sends a JSON payload when shipment status changes.
 *
 * Docs: https://docs.geliver.io/docs/category/webhooklar
 * SDK ref (WebhookUpdateTrackingRequest): https://github.com/GeliverApp/geliver-js
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// ─── Geliver webhook payload types ───────────────────────────────────────────

interface GéliverTrackingStatus {
  trackingStatusCode?: string
  trackingSubStatusCode?: string
  statusDetails?: string
  statusDate?: string
}

interface GéliverShipmentPayload {
  id?: string
  trackingNumber?: string
  trackingUrl?: string
  labelURL?: string
  barcode?: string
  trackingStatus?: GéliverTrackingStatus
  statusCode?: string
}

interface GéliverWebhookPayload {
  /** Event type. Currently only "TRACK_UPDATED" is documented. */
  event: string
  metadata?: string
  /** Full Shipment object */
  data: GéliverShipmentPayload
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const evt = req.body as GéliverWebhookPayload

  if (!evt?.event || !evt?.data) {
    res.status(400).json({ error: "Invalid Geliver webhook payload" })
    return
  }

  const logger = req.scope.resolve<{ info: (m: string) => void; warn: (m: string) => void }>("logger")

  if (evt.event === "TRACK_UPDATED") {
    const s = evt.data
    logger.info(
      `[geliver-webhook] TRACK_UPDATED` +
      ` shipment=${s.id ?? "?"}` +
      ` status=${s.trackingStatus?.trackingStatusCode ?? s.statusCode ?? "?"}` +
      ` sub=${s.trackingStatus?.trackingSubStatusCode ?? "?"}` +
      ` tracking=${s.trackingNumber ?? "?"}`
    )
    // TODO: Use IFulfillmentModuleService to look up fulfillment by
    //       geliver_shipment_id (stored in fulfillment.data) and update
    //       tracking_number / tracking_url when they become available.
    //
    // const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)
    // const fulfillments = await fulfillmentModule.listFulfillments({...})
    // ...
  } else {
    logger.info(
      `[geliver-webhook] Received unknown event=${evt.event}` +
      ` shipment=${evt.data?.id ?? "?"}`
    )
  }

  res.status(200).json({ received: true })
}
