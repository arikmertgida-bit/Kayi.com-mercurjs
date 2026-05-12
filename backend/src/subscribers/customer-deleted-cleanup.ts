import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Handles the "customer.deleted" event.
 *
 * MedusaJS v2 manages the Customer module and Auth module independently —
 * deleting a customer from the admin panel does NOT automatically remove the
 * associated auth_identity / provider_identity records.  This subscriber
 * closes that gap so the same e-mail address can be re-registered after
 * a customer is deleted.
 */
export default async function customerDeletedCleanupSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const authModuleService = container.resolve(Modules.AUTH)

  const customerId = data.id

  try {
    // Find all auth identities that are linked to this customer id.
    // In MedusaJS v2 the actor_id on the auth_identity points to the
    // customer record.
    const authIdentities = await authModuleService.listAuthIdentities({
      app_metadata: { customer_id: customerId },
    })

    if (!authIdentities || authIdentities.length === 0) {
      logger.debug(
        `[customer-deleted-cleanup] No auth identities found for customer ${customerId} — nothing to clean up.`
      )
      return
    }

    const ids = authIdentities.map((ai) => ai.id)

    await authModuleService.deleteAuthIdentities(ids)

    logger.info(
      `[customer-deleted-cleanup] Deleted ${ids.length} auth identity record(s) for customer ${customerId}: ${ids.join(", ")}`
    )
  } catch (err) {
    // Log but do not rethrow — the customer is already deleted; a cleanup
    // failure should not surface as an unhandled error.
    logger.error(
      `[customer-deleted-cleanup] Failed to clean up auth identities for customer ${customerId}: ${(err as Error)?.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "customer.deleted",
}
