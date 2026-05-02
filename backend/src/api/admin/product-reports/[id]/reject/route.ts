import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_REPORT_MODULE } from "../../../../../modules/product-reports"
import ProductReportService from "../../../../../modules/product-reports/service"
import { notifyMessengerUser } from "../../../../../lib/messenger"

const ADMIN_SYSTEM_ID = "admin-system"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if ((req as any).auth_context?.actor_type !== "user") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }

  const { id } = req.params
  const reportService: ProductReportService = req.scope.resolve(PRODUCT_REPORT_MODULE)
  const productService = req.scope.resolve(Modules.PRODUCT)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const [report] = await reportService.listProductReports({ id })
  if (!report) {
    return res.status(404).json({ message: "Report not found" })
  }

  const productId = (report as any).product_id

  // Ürünü yayından kaldır (draft'a çek)
  try {
    await (productService as any).updateProducts(productId, { status: "draft" })
  } catch (err: unknown) {
    console.error("[product-report/reject] Failed to unpublish product:", (err as Error).message)
    return res.status(500).json({ message: "Failed to unpublish product" })
  }

  // Raporu resolved olarak işaretle
  await reportService.updateProductReports({ id, status: "resolved" })

  // Satıcıya bildirim gönder
  try {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "seller.id", "seller.name"],
      filters: { id: productId },
    })
    const product = (products as any[])?.[0]
    const sellerId: string | undefined = product?.seller?.id
    const productTitle: string = product?.title ?? productId

    if (sellerId) {
      notifyMessengerUser({
        targetUserId: sellerId,
        targetUserType: "SELLER",
        senderName: "Kayı.com",
        preview: `"${productTitle}" ürününüz kural ihlali nedeniyle yayından kaldırıldı.`,
        sourceUserId: ADMIN_SYSTEM_ID,
        sourceUserType: "ADMIN",
        subject: "Ürün Yayından Kaldırıldı",
        conversationType: "ADMIN_SUPPORT",
        notificationType: "report_notification",
      })
    }
  } catch (err: unknown) {
    // Bildirim hatası kritik değil, isteği başarılı say
    console.warn("[product-report/reject] Seller notification failed:", (err as Error).message)
  }

  // Raporu bildiren müşteriye de bildir
  const customerId = (report as any).customer_id
  if (customerId) {
    notifyMessengerUser({
      targetUserId: customerId,
      targetUserType: "CUSTOMER",
      senderName: "Kayı.com",
      preview: "Raporunuz incelendi. İhlal tespit edilen ürün yayından kaldırılmıştır. Duyarlılığınız için teşekkür ederiz.",
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: "Rapor Sonucu",
      conversationType: "ADMIN_SUPPORT",
      notificationType: "report_notification",
    })
  }

  return res.json({ success: true })
}
