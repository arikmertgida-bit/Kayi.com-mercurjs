import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageService from "../../../modules/review-images/service"

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

  const { review_id, urls } = req.body as { review_id: string; urls: string[] }

  if (!review_id || !urls?.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "review_id and urls are required")
  }

  if (urls.length > 3) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Maximum 3 images allowed per review")
  }

  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)

  const images = await reviewImageService.createReviewImages(
    urls.map((url) => ({ review_id, url }))
  )

  res.json({ images })
}
