import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createRegionsWorkflow, createTaxRegionsWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows"

export default async function addTryCurrency({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModuleService = container.resolve(Modules.STORE)
  const regionModuleService = container.resolve(Modules.REGION)

  logger.info("Checking current store configuration...")
  const [store] = await storeModuleService.listStores()

  const currentCurrencies = store.supported_currencies ?? []
  const hasTry = currentCurrencies.some(
    (c: any) => c.currency_code?.toLowerCase() === "try"
  )

  if (hasTry) {
    logger.info("TRY currency already exists in store. Ensuring it is default...")
  } else {
    logger.info("Adding TRY to supported currencies and setting as default...")
  }

  // Build currency list: TRY as default, keep/add USD and EUR
  const existingCodes = currentCurrencies.map((c: any) => c.currency_code?.toLowerCase())
  const baseCurrencies = ["usd", "eur"]
  const additionalCurrencies = baseCurrencies
    .filter((code) => !existingCodes.includes(code))
    .map((code) => ({ currency_code: code, is_default: false }))

  const updatedCurrencies = [
    { currency_code: "try", is_default: true },
    ...currentCurrencies
      .filter((c: any) => c.currency_code?.toLowerCase() !== "try")
      .map((c: any) => ({ currency_code: c.currency_code, is_default: false })),
    ...additionalCurrencies,
  ]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: updatedCurrencies,
      },
    },
  })
  logger.info(`Store updated. Supported currencies: ${updatedCurrencies.map((c) => c.currency_code).join(", ")}`)

  // Check if Turkey region already exists
  const existingRegions = await regionModuleService.listRegions({ name: "Türkiye" })
  if (existingRegions.length > 0) {
    logger.info("Türkiye region already exists, skipping region creation.")
  } else {
    logger.info("Creating Türkiye region...")
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Türkiye",
            currency_code: "try",
            countries: ["tr"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    logger.info("Türkiye region created.")

    logger.info("Creating tax region for TR...")
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "tr", provider_id: "tp_system" }],
    })
    logger.info("Tax region for TR created.")
  }

  logger.info("Done. TRY is now the default currency.")
}
