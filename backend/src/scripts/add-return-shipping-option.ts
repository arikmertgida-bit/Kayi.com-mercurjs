import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Idempotent exec script: adds "İade Kargo" return shipping option to the
 * "Türkiye Kargo" fulfillment set on "Varsayılan Depo" stock location.
 *
 * Run with: docker exec kaycom-backend-1 npx medusa exec src/scripts/add-return-shipping-option.ts
 */
export default async function addReturnShippingOption({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);

  // ── 1. Find the existing fulfillment set ──────────────────────────
  const fulfillmentSets = await fulfillmentService.listFulfillmentSets(
    { name: "Türkiye Kargo" },
    { take: 1, relations: ["service_zones"] }
  );

  if (!fulfillmentSets.length) {
    logger.error(
      "add-return-shipping-option: 'Türkiye Kargo' fulfillment set not found. Run setup-shipping.ts first."
    );
    return;
  }

  const fulfillmentSet = fulfillmentSets[0] as any;
  const serviceZoneId: string | undefined =
    fulfillmentSet.service_zones?.[0]?.id;

  if (!serviceZoneId) {
    logger.error(
      "add-return-shipping-option: No service zone found on 'Türkiye Kargo'."
    );
    return;
  }

  // ── 2. Check if İade Kargo already exists ─────────────────────────
  const existing = await fulfillmentService.listShippingOptions({
    name: "İade Kargo",
    service_zone: { id: serviceZoneId },
  });

  if (existing.length) {
    logger.info(
      `add-return-shipping-option: 'İade Kargo' already exists (${existing[0].id}) — skipping.`
    );
    return;
  }

  // ── 3. Get shipping profile ────────────────────────────────────────
  const profiles = await fulfillmentService.listShippingProfiles(
    { type: "default" },
    { take: 1 }
  );

  if (!profiles.length) {
    logger.error(
      "add-return-shipping-option: No default shipping profile found."
    );
    return;
  }

  const shippingProfileId = profiles[0].id;

  // ── 4. Create İade Kargo ───────────────────────────────────────────
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "İade Kargo",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfileId,
        type: {
          label: "İade",
          description: "Ürün iade kargo seçeneği.",
          code: "return",
        },
        prices: [
          {
            currency_code: "try",
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: "is_return",
            value: "true",
            operator: "eq",
          },
        ],
      },
    ],
  });

  logger.info(
    "add-return-shipping-option: 'İade Kargo' shipping option created successfully."
  );
}
