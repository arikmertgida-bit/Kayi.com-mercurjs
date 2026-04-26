import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../../../modules/review-image-reports"
import { REVIEW_IMAGE_MODULE } from "../../../../../modules/review-images"
import ReviewImageReportService from "../../../../../modules/review-image-reports/service"
import ReviewImageService from "../../../../../modules/review-images/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Require admin (user) actor type
  if ((req as any).auth_context?.actor_type !== "user") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }

  const { id } = req.params
  const { action } = req.body as { action: "hide" | "publish" }

  if (!action || !["hide", "publish"].includes(action)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "action must be 'hide' or 'publish'")
  }

  const reportService: ReviewImageReportService = req.scope.resolve(REVIEW_IMAGE_REPORT_MODULE)
  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)

  const [report] = await reportService.listReviewImageReports({ id })
  if (!report) {
    return res.status(404).json({ message: "Report not found" })
  }

  // Update image visibility
  await reviewImageService.updateReviewImages(
    { id: (report as any).review_image_id },
    { is_hidden: action === "hide" }
  )

  // Resolve report
  await reportService.updateReviewImageReports(
    { id },
    {
      status: "resolved",
      action_taken: action === "hide" ? "hidden" : "published",
    }
  )

  res.json({ success: true, action })
}
