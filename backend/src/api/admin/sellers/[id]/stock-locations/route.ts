import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * GET /admin/sellers/:id/stock-locations
 * List all stock locations linked to a seller
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: links } = await query.graph({
    entity: "seller_stock_location",
    fields: ["stock_location_id"],
    filters: { seller_id: id },
  });

  const locationIds = (links ?? []).map((l: any) => l.stock_location_id);

  if (locationIds.length === 0) {
    return res.json({ stock_locations: [] });
  }

  const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION);
  const { data: stockLocations } = await stockLocationService.listStockLocations(
    { id: locationIds },
    { take: 9999 }
  );

  res.json({ stock_locations: stockLocations ?? [] });
}

/**
 * POST /admin/sellers/:id/stock-locations
 * Assign a stock location to a seller
 * Body: { stock_location_id: string }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const { stock_location_id } = req.body as { stock_location_id: string };

  if (!stock_location_id) {
    return res.status(400).json({ message: "stock_location_id is required" });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  // Check if already linked
  const { data: existingLinks } = await query.graph({
    entity: "seller_stock_location",
    fields: ["stock_location_id"],
    filters: { seller_id: id, stock_location_id },
  });

  if (existingLinks && existingLinks.length > 0) {
    return res.status(409).json({ message: "Stock location already linked to this seller" });
  }

  await remoteLink.create([
    {
      seller: { seller_id: id },
      [Modules.STOCK_LOCATION]: { stock_location_id },
    },
  ]);

  res.status(201).json({ message: "Stock location linked successfully" });
}
