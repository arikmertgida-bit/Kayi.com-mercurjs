import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REPORT_MODULE } from "../../../../../modules/product-reports"
import ProductReportService from "../../../../../modules/product-reports/service"
import { notifyMessengerUser } from "../../../../../lib/messenger"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if ((req as any).auth_context?.actor_type !== "user") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }

  const { id } = req.params
  const reportService: ProductReportService = req.scope.resolve(PRODUCT_REPORT_MODULE)

  const [report] = await reportService.listProductReports({ id })
  if (!report) {
    return res.status(404).json({ message: "Report not found" })
  }

  await reportService.updateProductReports({ id, status: "dismissed" })

  const customerId = (report as any).customer_id
  if (customerId) {
    notifyMessengerUser({
      targetUserId: customerId,
      targetUserType: "CUSTOMER",
      senderName: "Kayı.com",
      preview: "Raporunuz incelendi. Bu sefer işlem yapılmamıştır.",
      sourceUserId: "admin-system",
      sourceUserType: "ADMIN",
      subject: "Rapor Sonucu",
      conversationType: "ADMIN_SUPPORT",
      notificationType: "report_notification",
    })
  }

  return res.json({ success: true })
}
