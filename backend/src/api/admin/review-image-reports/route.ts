import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../modules/review-image-reports"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageReportService from "../../../modules/review-image-reports/service"
import ReviewImageService from "../../../modules/review-images/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { status, offset = "0", limit = "20" } = req.query as {
    status?: string
    offset?: string
    limit?: string
  }

  const reportService: ReviewImageReportService = req.scope.resolve(REVIEW_IMAGE_REPORT_MODULE)
  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)

  const filters: Record<string, any> = {}
  if (status) filters.status = status

  const reports = await reportService.listReviewImageReports(filters, {
    skip: parseInt(offset),
    take: parseInt(limit),
  })

  const count = await reportService.countReviewImageReports(filters)

  // Attach image URL to each report
  const reportsWithImages = await Promise.all(
    reports.map(async (report: any) => {
      try {
        const [image] = await reviewImageService.listReviewImages({ id: report.review_image_id })
        return { ...report, image }
      } catch {
        return { ...report, image: null }
      }
    })
  )

  res.json({ reports: reportsWithImages, count })
}
