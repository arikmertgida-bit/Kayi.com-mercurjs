import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Idempotent exec script: creates Turkish VAT rate records for the TR tax region.
 *
 * Turkish VAT rates:
 *   - %1  → Temel gıda, tarım ürünleri
 *   - %10 → Gıda, ilaç, konaklama, ulaşım
 *   - %20 → Standart oran (diğer tüm ürünler)
 *
 * Run with: docker exec kaycom-backend-1 npx medusa exec src/scripts/setup-turkey-vat.ts
 */
export default async function setupTurkeyVat({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const taxService = container.resolve(Modules.TAX);

  // ── 1. Find the TR tax region ──────────────────────────────────────
  const taxRegions = await taxService.listTaxRegions({
    country_code: "tr",
  });

  if (!taxRegions.length) {
    logger.error(
      "setup-turkey-vat: TR tax region not found. Run seed.ts first to create it."
    );
    return;
  }

  const taxRegionId = taxRegions[0].id;
  logger.info(`setup-turkey-vat: Found TR tax region: ${taxRegionId}`);

  // ── 2. Check idempotency — skip if rates already exist ────────────
  const existing = await taxService.listTaxRates({
    tax_region_id: taxRegionId,
  });

  const existingCodes = new Set(existing.map((r) => r.code));

  const vatRates = [
    {
      code: "kdv-20",
      name: "KDV %20 (Standart)",
      rate: 20,
    },
    {
      code: "kdv-10",
      name: "KDV %10 (İndirimli)",
      rate: 10,
    },
    {
      code: "kdv-1",
      name: "KDV %1 (Temel İhtiyaç)",
      rate: 1,
    },
  ];

  const toCreate = vatRates.filter((r) => !existingCodes.has(r.code));

  if (!toCreate.length) {
    logger.info(
      "setup-turkey-vat: All VAT rates already exist — nothing to do."
    );
    return;
  }

  // ── 3. Create missing VAT rates ────────────────────────────────────
  await taxService.createTaxRates(
    toCreate.map((r) => ({
      tax_region_id: taxRegionId,
      rate: r.rate,
      code: r.code,
      name: r.name,
      is_combinable: false,
    }))
  );

  for (const r of toCreate) {
    logger.info(`setup-turkey-vat: Created '${r.name}' (${r.rate}%)`);
  }

  logger.info("setup-turkey-vat: Done.");
}
