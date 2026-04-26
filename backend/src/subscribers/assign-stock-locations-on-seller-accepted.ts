import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { SellerAccountRequestUpdatedEvent } from "@mercurjs/framework";

/**
 * When a seller creation request is accepted, automatically assigns
 * all existing stock locations to the new seller.
 */
export default async function assignStockLocationsOnSellerAccepted({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);

  const requestId = event.data?.id;
  if (!requestId) {
    logger.warn("assign-stock-locations: no request id in event data");
    return;
  }

  const { data: requests } = await query.graph({
    entity: "request",
    fields: ["id", "status", "data"],
    filters: { id: requestId },
  });

  const request = requests?.[0];
  if (!request) {
    logger.warn(`assign-stock-locations: request ${requestId} not found`);
    return;
  }

  const sellerId = (request.data as any)?.seller_id;
  if (!sellerId) {
    logger.warn(
      `assign-stock-locations: no seller_id in request.data for request ${requestId}`
    );
    return;
  }

  const STOCK_LOCATION_LIMIT = 500;
  const stockLocations =
    await stockLocationService.listStockLocations({}, { take: STOCK_LOCATION_LIMIT });

  if (!stockLocations || stockLocations.length === 0) {
    logger.warn("assign-stock-locations: no stock locations found");
    return;
  }

  if (stockLocations.length === STOCK_LOCATION_LIMIT) {
    logger.warn(
      `assign-stock-locations: result capped at ${STOCK_LOCATION_LIMIT} — some stock locations may not be linked to seller ${sellerId}. Increase STOCK_LOCATION_LIMIT if needed.`
    );
  }

  const { data: existingLinks } = await query.graph({
    entity: "seller_stock_location",
    fields: ["stock_location_id"],
    filters: { seller_id: sellerId },
  });

  const alreadyLinked = new Set(
    (existingLinks ?? []).map((l: any) => l.stock_location_id)
  );

  const toLink = stockLocations.filter((sl) => !alreadyLinked.has(sl.id));

  if (toLink.length === 0) {
    logger.info(
      `assign-stock-locations: seller ${sellerId} already has all stock locations`
    );
    return;
  }

  const links = toLink.map((location) => ({
    seller: { seller_id: sellerId },
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
  }));

  await remoteLink.create(links);

  logger.info(
    `assign-stock-locations: linked ${toLink.length} stock location(s) to seller ${sellerId}`
  );
}

export const config: SubscriberConfig = {
  event: SellerAccountRequestUpdatedEvent.ACCEPTED,
  context: {
    subscriberId: "assign-stock-locations-on-seller-accepted",
  },
};
