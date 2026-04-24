import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { SellerRequest } from "@mercurjs/framework";
import { acceptSellerCreationRequestWorkflow } from "@mercurjs/requests/workflows";

export default async function autoApproveSellerRequestHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const submitterId = event.data?.submitter_id as string | undefined;
  if (!submitterId) {
    logger.warn("auto-approve-seller-request: no submitter_id in event data");
    return;
  }

  const { data: requests } = await query.graph({
    entity: "request",
    fields: ["id", "status", "type"],
    filters: {
      submitter_id: submitterId,
      type: "seller",
      status: "pending",
    },
  });

  if (!requests || requests.length === 0) {
    logger.warn(
      `auto-approve-seller-request: no pending seller request found for submitter ${submitterId}`
    );
    return;
  }

  const request = requests[0];

  logger.info(
    `auto-approve-seller-request: auto-approving seller request ${request.id}`
  );

  await acceptSellerCreationRequestWorkflow(container).run({
    input: {
      id: request.id,
      reviewer_id: "system",
      reviewer_note: "Automatically approved",
      status: "accepted",
      data: {},
    },
    throwOnError: true,
  });
}

export const config: SubscriberConfig = {
  event: SellerRequest.CREATED,
  context: {
    subscriberId: "auto-approve-seller-request-handler",
  },
};
