import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REPORT_MODULE } from "../../../../modules/product-reports"
import ProductReportService from "../../../../modules/product-reports/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  if ((req as any).auth_context?.actor_type !== "user") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }

  const { id } = req.params
  const reportService: ProductReportService = req.scope.resolve(PRODUCT_REPORT_MODULE)

  const [report] = await reportService.listProductReports({ id })
  if (!report) {
    return res.status(404).json({ message: "Report not found" })
  }

  await reportService.deleteProductReports(id)

  return res.json({ success: true })
}
