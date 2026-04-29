import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const filters: Record<string, any> = {}
  if (status) filters.status = status

  const reports = await reportService.listReviewImageReports(filters, {
    skip: parseInt(offset),
    take: parseInt(limit),
  })

  // Get total count with same filters but no pagination
  const allForCount = await reportService.listReviewImageReports(filters, {})
  const count = allForCount.length

  // Batch fetch images
  const imageIds = reports.map((r: any) => r.review_image_id).filter(Boolean)
  const allImages = imageIds.length > 0
    ? await reviewImageService.listReviewImages({ id: imageIds })
    : []

  const imagesById = (allImages as any[]).reduce((acc: Record<string, any>, img: any) => {
    acc[img.id] = img
    return acc
  }, {})

  // Batch resolve customer names
  const customerIds = [...new Set(
    reports.map((r: any) => r.customer_id).filter((id: string) => id && id !== "anonymous")
  )]

  let customerNames: Record<string, string> = {}
  if (customerIds.length > 0) {
    try {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name"],
        filters: { id: customerIds },
      })
      for (const c of customers as any[]) {
        customerNames[c.id] = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.id
      }
    } catch { /* non-critical */ }
  }

  const reportsWithImages = reports.map((report: any) => ({
    ...report,
    image: imagesById[report.review_image_id] ?? null,
    customer_name: report.customer_id === "anonymous"
      ? "Misafir"
      : (customerNames[report.customer_id] ?? report.customer_id),
  }))

  res.json({ reports: reportsWithImages, count })
}
