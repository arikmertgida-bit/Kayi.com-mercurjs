import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const StoreGetReviewsParams = createFindParams({
  offset: 0,
  limit: 50,
})

export const StoreCreateReview = z.object({
  order_id: z.string().optional(),
  reference: z.enum(["seller", "product"]),
  reference_id: z.string(),
  rating: z.number().int().min(1).max(5),
  customer_note: z.string().max(300).nullable(),
})

export const StoreUpdateReview = z.object({
  rating: z.number().int().min(1).max(5),
  customer_note: z.string().max(300).nullable(),
})