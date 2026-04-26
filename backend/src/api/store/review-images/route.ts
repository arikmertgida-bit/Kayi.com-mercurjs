import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageService from "../../../modules/review-images/service"

const createReviewImagesSchema = z.object({
  review_id: z.string().min(1),
  urls: z
    .array(z.string().url("Each URL must be a valid URL").max(2048, "URL too long"))
    .min(1, "At least one URL is required")
    .max(3, "Maximum 3 images allowed per review"),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { review_id } = req.query as { review_id?: string }

  if (!review_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "review_id is required")
  }

  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)

  const images = await reviewImageService.listReviewImages({
    review_id,
    is_hidden: false,
  })

  res.json({ images })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const parsed = createReviewImagesSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.errors[0].message)
  }
  const { review_id, urls } = parsed.data

  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)

  const images = await reviewImageService.createReviewImages(
    urls.map((url) => ({ review_id, url }))
  )

  res.json({ images })
}
