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

  const count = await (reportService as any).countReviewImageReports(filters)

  // Batch fetch all images in a single query (eliminates N+1)
  const imageIds = reports.map((r: any) => r.review_image_id).filter(Boolean)
  const allImages = imageIds.length > 0
    ? await reviewImageService.listReviewImages({ id: imageIds })
    : []

  const imagesById = (allImages as any[]).reduce((acc: Record<string, any>, img: any) => {
    acc[img.id] = img
    return acc
  }, {})

  const reportsWithImages = reports.map((report: any) => ({
    ...report,
    image: imagesById[report.review_image_id] ?? null,
  }))

  res.json({ reports: reportsWithImages, count })
}
