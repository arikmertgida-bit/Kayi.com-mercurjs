import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export type AssignToDefaultSalesChannelStepInput = {
  product_id: string
}

type StepCompensation =
  | { linked: false }
  | { linked: true; product_id: string; sales_channel_id: string }

/**
 * Assigns a product to the store's default sales channel (idempotent).
 *
 * - Fetches default_sales_channel_id from the `store` table.
 * - Skips silently if no default channel is configured or the link already exists.
 * - Compensation: dismisses the link if it was created by this step.
 */
export const assignToDefaultSalesChannelStep = createStep(
  {
    name: "assign-to-default-sales-channel",
    maxRetries: 3,
    retryInterval: 5,
  },
  async (
    { product_id }: AssignToDefaultSalesChannelStepInput,
    { container }
  ): Promise<StepResponse<undefined, StepCompensation>> => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    // Fetch the store's default sales channel ID
    const storeRow = await knex("store")
      .select("default_sales_channel_id")
      .whereNull("deleted_at")
      .first()

    const salesChannelId: string | undefined = storeRow?.default_sales_channel_id

    if (!salesChannelId) {
      // Platform not yet fully seeded — nothing to do
      return new StepResponse<undefined, StepCompensation>(undefined, { linked: false })
    }

    // Idempotency guard: link may already exist (e.g. imported products)
    const existing = await knex("product_sales_channel")
      .where({ product_id, sales_channel_id: salesChannelId })
      .first()

    if (existing) {
      return new StepResponse<undefined, StepCompensation>(undefined, { linked: false })
    }

    await link.create([
      {
        [Modules.PRODUCT]: { product_id },
        [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannelId },
      },
    ])

    return new StepResponse<undefined, StepCompensation>(undefined, {
      linked: true,
      product_id,
      sales_channel_id: salesChannelId,
    })
  },
  async (compensation: StepCompensation | undefined, { container }) => {
    if (!compensation || !compensation.linked) return

    const link = container.resolve(ContainerRegistrationKeys.LINK)

    await link.dismiss([
      {
        [Modules.PRODUCT]: { product_id: compensation.product_id },
        [Modules.SALES_CHANNEL]: { sales_channel_id: compensation.sales_channel_id },
      },
    ])
  }
)
