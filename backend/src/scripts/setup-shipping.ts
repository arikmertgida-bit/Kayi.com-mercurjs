import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Sets up shipping for "Varsayılan Depo" stock location:
 * - Creates a fulfillment set with a Turkey service zone
 * - Links manual_manual provider
 * - Creates "Standart Kargo" and "Hızlı Kargo" options in TRY
 *
 * Run with: docker exec kaycom-backend-1 npx medusa exec src/scripts/setup-shipping.ts
 */
export default async function setupShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);

  // ── 1. Find "Varsayılan Depo" ──────────────────────────────────────
  const stockLocations = await stockLocationService.listStockLocations(
    { name: "Varsayılan Depo" },
    { take: 1 }
  );

  if (!stockLocations.length) {
    logger.error("setup-shipping: 'Varsayılan Depo' stock location not found");
    return;
  }

  const varsayilanDepo = stockLocations[0];
  logger.info(`setup-shipping: Found stock location: ${varsayilanDepo.id}`);

  // ── 2. Get or create shipping profile ─────────────────────────────
  const existingProfiles = await fulfillmentService.listShippingProfiles({
    type: "default",
  });

  let shippingProfileId: string;

  if (existingProfiles.length) {
    shippingProfileId = existingProfiles[0].id;
    logger.info(
      `setup-shipping: Using existing shipping profile: ${shippingProfileId}`
    );
  } else {
    const { result: profileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [{ name: "Varsayılan Kargo Profili", type: "default" }],
        },
      });
    shippingProfileId = profileResult[0].id;
    logger.info(
      `setup-shipping: Created shipping profile: ${shippingProfileId}`
    );
  }

  // ── 3. Check existing fulfillment sets for this location ──────────
  const existingSets = await fulfillmentService.listFulfillmentSets({
    name: "Türkiye Kargo",
  });

  if (existingSets.length) {
    logger.info(
      `setup-shipping: Fulfillment set 'Türkiye Kargo' already exists: ${existingSets[0].id}. Skipping.`
    );
    return;
  }

  // ── 4. Create fulfillment set with Turkey service zone ─────────────
  const fulfillmentSet = await fulfillmentService.createFulfillmentSets({
    name: "Türkiye Kargo",
    type: "shipping",
    service_zones: [
      {
        name: "Türkiye",
        geo_zones: [
          {
            country_code: "tr",
            type: "country" as const,
          },
        ],
      },
    ],
  });

  logger.info(
    `setup-shipping: Created fulfillment set: ${fulfillmentSet.id}`
  );
  const serviceZoneId = fulfillmentSet.service_zones[0].id;

  // ── 5. Link fulfillment set → Varsayılan Depo ──────────────────────
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: varsayilanDepo.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  logger.info(
    `setup-shipping: Linked fulfillment set to stock location`
  );

  // ── 6. Link manual_manual provider → Varsayılan Depo ──────────────
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: varsayilanDepo.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info(
    `setup-shipping: Linked manual_manual provider to stock location`
  );

  // ── 7. Create shipping options ─────────────────────────────────────
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standart Kargo",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfileId,
        type: {
          label: "Standart",
          description: "3-5 iş günü içinde teslim.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "try",
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Hızlı Kargo",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfileId,
        type: {
          label: "Hızlı",
          description: "1-2 iş günü içinde teslim.",
          code: "express",
        },
        prices: [
          {
            currency_code: "try",
            amount: 5900,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  logger.info(
    `setup-shipping: Created 'Standart Kargo' (ücretsiz) and 'Hızlı Kargo' (59 TRY) shipping options`
  );
  logger.info("setup-shipping: Done.");
}
