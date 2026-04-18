import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * DELETE /admin/sellers/:id/stock-locations/:locationId
 * Remove a stock location link from a seller
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id, locationId } = req.params;
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  await remoteLink.dismiss([
    {
      seller: { seller_id: id },
      [Modules.STOCK_LOCATION]: { stock_location_id: locationId },
    },
  ]);

  res.status(200).json({ message: "Stock location unlinked successfully" });
}
