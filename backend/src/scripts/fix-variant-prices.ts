/**
 * Migration script: fix-variant-prices
 *
 * Problem: Variants created through the vendor panel had prices saved as
 * { currency_code: "try", amount } with NO region_id price rule.
 * Medusa v2's pricing engine calculates `calculated_price` using the best
 * matching price rule. Without a region_id rule the storefront shows
 * "Not available in your region" even when the region uses TRY currency.
 *
 * Fix: For every variant that has a TRY price without a region_id rule,
 * remove those bare prices and add new ones with rules: { region_id }.
 *
 * Run: medusa exec src/scripts/fix-variant-prices.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function fixVariantPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionService = container.resolve(Modules.REGION)
  const pricingService = container.resolve(Modules.PRICING) as any

  // 1. Find the Turkey region (currency_code = "try")
  const [turkeyRegions] = await regionService.listAndCountRegions(
    { currency_code: "try" },
    { take: 10 }
  )

  if (!turkeyRegions.length) {
    logger.warn("No region with currency_code 'try' found. Aborting.")
    return
  }

  const turkeyRegion = turkeyRegions[0]
  logger.info(`Found Turkey region: ${turkeyRegion.name} (${turkeyRegion.id})`)

  // 2. Query all prices that have currency_code = "try" with their price rules
  //    and the price_set_id they belong to
  const { data: allPrices } = await query.graph({
    entity: "price",
    fields: ["id", "currency_code", "amount", "price_set_id", "price_rules.*"],
    filters: { currency_code: "try" },
  })

  logger.info(`Found ${allPrices.length} TRY prices to inspect.`)

  // 3. Filter: only prices that have NO region_id rule
  const pricesToFix = (allPrices as any[]).filter((p) => {
    const hasRegionRule = (p.price_rules ?? []).some(
      (rule: any) => rule.attribute === "region_id"
    )
    return !hasRegionRule
  })

  logger.info(`${pricesToFix.length} TRY prices have no region_id rule — fixing.`)

  if (!pricesToFix.length) {
    logger.info("Nothing to fix. Migration complete.")
    return
  }

  // 4. For each price: remove old bare price, add new price with region_id rule
  let fixed = 0
  let failed = 0

  for (const price of pricesToFix) {
    try {
      // Remove old price (no rule)
      await pricingService.removePrices([price.id])

      // Add new price with Turkey region rule on the same price set
      await pricingService.addPrices({
        priceSetId: price.price_set_id,
        prices: [
          {
            currency_code: "try",
            amount: price.amount,
            rules: { region_id: turkeyRegion.id },
          },
        ],
      })

      fixed++
      if (fixed % 10 === 0) {
        logger.info(`Progress: fixed ${fixed}/${pricesToFix.length} prices...`)
      }
    } catch (err) {
      logger.error(`Failed to fix price ${price.id}: ${(err as Error).message}`)
      failed++
    }
  }

  logger.info(
    `Migration complete. Fixed: ${fixed} prices. Failed: ${failed}.`
  )
}


