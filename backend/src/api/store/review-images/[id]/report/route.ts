import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { REVIEW_IMAGE_MODULE } from "../../../../../modules/review-images"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../../../modules/review-image-reports"
import ReviewImageService from "../../../../../modules/review-images/service"
import ReviewImageReportService from "../../../../../modules/review-image-reports/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { id } = req.params
  const { reason } = req.body as { reason: string }

  if (!reason?.trim()) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "reason is required")
  }

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

  // Auto-hide image on report (Facebook-style: hidden until admin reviews)
  await reviewImageService.updateReviewImages({ id }, { is_hidden: true })

  res.json({ report })
}
