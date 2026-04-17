import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ProductRequestUpdatedEvent } from "@mercurjs/framework";
import { acceptProductRequestWorkflow } from "@mercurjs/requests/workflows";

/**
 * Auto-approves every product publish request from vendors.
 * Overrides the default subscriber (same subscriberId) to bypass
 * the REQUIRE_PRODUCT_APPROVAL configuration rule check.
 */
export default async function autoApproveProductRequestHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { id } = event.data;

  const { data: requests } = await query.graph({
    entity: "request",
    fields: ["id", "status", "data"],
    filters: { id },
  });

  const request = requests?.[0];

  if (!request) {
    logger.warn(`auto-approve-product-request: request ${id} not found`);
    return;
  }

  if (request.status !== "pending") {
    logger.info(
      `auto-approve-product-request: request ${id} is not pending (${request.status}), skipping`
    );
    return;
  }

  logger.info(
    `auto-approve-product-request: auto-approving product request ${id}`
  );

  await acceptProductRequestWorkflow(container).run({
    input: {
      data: request.data,
      id: request.id,
      reviewer_id: "system",
      reviewer_note: "Automatically approved",
      status: "accepted",
    },
    throwOnError: true,
  });
}

export const config: SubscriberConfig = {
  event: ProductRequestUpdatedEvent.CREATED,
  context: {
    subscriberId: "auto-approve-product-request-handler",
  },
};
