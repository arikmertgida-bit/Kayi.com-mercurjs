import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { REVIEW_IMAGE_MODULE } from "../../../../../modules/review-images"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../../../modules/review-image-reports"
import ReviewImageService from "../../../../../modules/review-images/service"
import ReviewImageReportService from "../../../../../modules/review-image-reports/service"

const reportImageSchema = z.object({
  reason: z.string().trim().min(1, "reason is required").max(500, "reason must be 500 characters or fewer"),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Auth optional — both logged-in and anonymous users can report
  const customerId = (req as any).auth_context?.actor_id ?? "anonymous"

  const { id } = req.params
  const parsed = reportImageSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.errors[0].message)
  }
  const { reason } = parsed.data

  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)
  const reportService: ReviewImageReportService = req.scope.resolve(REVIEW_IMAGE_REPORT_MODULE)

  // Verify image exists
  const [image] = await reviewImageService.listReviewImages({ id })
  if (!image) {
    return res.status(404).json({ message: "Image not found" })
  }

  // Create report
  const report = await reportService.createReviewImageReports({
    review_image_id: id,
    customer_id: customerId,
    reason,
  })

  // Auto-hide image on report — hidden from all users until admin reviews
  await reviewImageService.updateReviewImages({ id }, { is_hidden: true })

  res.json({ report })
}
