import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_IMAGE_MODULE } from "../../../../../../modules/review-images"
import ReviewImageService from "../../../../../../modules/review-images/service"
// @ts-ignore — import workflow from mercurjs package
import { updateReviewWorkflow } from "@mercurjs/reviews/workflows"

// Override @mercurjs/reviews vendor GET /vendor/sellers/me/reviews/:id
// to include review images from our custom review-images module
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [review] } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "rating",
      "customer_note",
      "customer_id",
      "seller_note",
      "reference",
      "reference_id",
      "created_at",
      "updated_at",
      "customer.first_name",
      "customer.last_name",
    ],
    filters: { id },
  })

  if (!review) {
    return res.status(404).json({ message: "Review not found" })
  }

  // Attach images from our custom module
  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)
  let images: Array<{ id: string; url: string; is_hidden: boolean }> = []
  try {
    images = await reviewImageService.listReviewImages({ review_id: id, is_hidden: false })
  } catch { /* non-critical */ }

  return res.json({ review: { ...review, images } })
}

// Re-implement POST using mercurjs updateReviewWorkflow
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await updateReviewWorkflow.run({
    container: req.scope,
    input: { id, ...(req as any).validatedBody },
  })

  const { data: [review] } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "rating",
      "customer_note",
      "customer_id",
      "seller_note",
      "reference",
      "reference_id",
      "created_at",
      "updated_at",
    ],
    filters: { id },
  })

  return res.json({ review })
}

