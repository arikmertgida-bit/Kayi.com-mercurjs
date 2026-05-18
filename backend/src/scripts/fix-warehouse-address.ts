import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Idempotent exec script: updates the Main Warehouse stock location address
 * from the default US/New York values to Istanbul/TR.
 *
 * Run with: docker exec kaycom-backend-1 npx medusa exec src/scripts/fix-warehouse-address.ts
 */
export default async function fixWarehouseAddress({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);

  const locations = await stockLocationService.listStockLocations(
    { name: "Main Warehouse" },
    { take: 1, relations: ["address"] }
  );

  if (!locations.length) {
    logger.warn(
      "fix-warehouse-address: 'Main Warehouse' not found — nothing to do."
    );
    return;
  }

  const location = locations[0];
  const address = (location as any).address;

  if (address?.country_code === "tr") {
    logger.info(
      `fix-warehouse-address: address already set to TR — skipping.`
    );
    return;
  }

  await stockLocationService.updateStockLocations(location.id, {
    address: {
      city: "İstanbul",
      country_code: "tr",
      address_1: "Levent",
    },
  });

  logger.info(
    `fix-warehouse-address: Updated '${location.name}' address to İstanbul/TR.`
  );
}
