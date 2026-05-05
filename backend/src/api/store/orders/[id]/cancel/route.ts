import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { notifyMessengerUser } from "../../../../../lib/messenger"

/**
 * POST /store/orders/:id/cancel
 *
 * Allows an authenticated customer to cancel their own order.
 * The cancelOrderWorkflow internally validates that:
 *  - the order is not already cancelled
 *  - the order has no active (non-cancelled) fulfillments
 * If any of those checks fail, the workflow throws and a 400 is returned.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const orderId = req.params.id
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Verify the order exists and belongs to this customer
  const order = await knex("order")
    .select("id", "status", "customer_id", "display_id")
    .where({ id: orderId, deleted_at: null })
    .first()

  if (!order) {
    return res.status(404).json({ message: "Order not found." })
  }

  if (order.customer_id !== customerId) {
    return res.status(403).json({ message: "You do not have permission to cancel this order." })
  }

  if (order.status === "cancelled") {
    return res.status(409).json({ message: "Order is already cancelled." })
  }

  if (order.status === "completed") {
    return res.status(409).json({ message: "Completed orders cannot be cancelled." })
  }

  try {
    await cancelOrderWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        canceled_by: customerId,
      },
    })
  } catch (err: any) {
    const message = err?.message ?? "Unable to cancel this order. The order may already be in fulfillment."
    return res.status(400).json({ message })
  }

  // Fire-and-forget: notify the customer via messenger
  notifyMessengerUser({
    targetUserId: customerId,
    targetUserType: "CUSTOMER",
    preview: `#${order.display_id} numaralı siparişiniz iptal edildi.`,
    notificationType: "order_canceled",
  }).catch(() => {
    // Non-critical — do not fail the response
  })

  return res.status(200).json({ message: "Order cancelled successfully.", order_id: orderId })
}
