import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../../../modules/review-image-reports"
import { REVIEW_IMAGE_MODULE } from "../../../../../modules/review-images"
import ReviewImageReportService from "../../../../../modules/review-image-reports/service"
import ReviewImageService from "../../../../../modules/review-images/service"
import { notifyMessengerUser } from "../../../../../lib/messenger"

// Sistem tarafında admin bildirimler için sabit bir gönderici ID'si
const ADMIN_SYSTEM_ID = "admin-system"

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

  const imageId = (report as any).review_image_id
  const customerId = (report as any).customer_id

  if (action === "hide") {
    // Permanently remove image (soft-delete, invisible to all queries)
    await reviewImageService.softDeleteReviewImages(imageId)
    // Also soft-delete the report itself — no reason to keep it after permanent removal
    await reportService.softDeleteReviewImageReports(id)
  } else {
    // Publish — unhide image (stays visible on storefront)
    // MedusaJS v2 MedusaService: id + updated fields must be in a single object (Overload 1)
    await reviewImageService.updateReviewImages({ id: imageId, is_hidden: false })
    // Soft-delete the report so it disappears from the admin list (image remains public)
    await reportService.softDeleteReviewImageReports(id)
  }

  // Bildiren müşteriye tek yönlü admin mesajı gönder (fire-and-forget)
  if (customerId && customerId !== "anonymous") {
    const message =
      action === "hide"
        ? "Duyarlılığınız ve ilginizden dolayı Kayı.com ailesi olarak teşekkür ederiz. Görsel tamamen sistemlerimizden kaldırılmıştır."
        : "Nezaketiniz ve ilginizden dolayı teşekkür ederiz. Bu görsel politikamızı ihlal etmediğini düşünüyoruz; siz aynı fikirde değilseniz lütfen tekrar inceleyip bize ihbar edebilirsiniz."

    notifyMessengerUser({
      targetUserId: customerId,
      targetUserType: "CUSTOMER",
      senderName: "Kayı.com",
      preview: message,
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: "Görsel İnceleme Sonucu",
      conversationType: "ADMIN_SUPPORT",
      notificationType: "review_notification",
    })
  }

  res.json({ success: true, action })
}
