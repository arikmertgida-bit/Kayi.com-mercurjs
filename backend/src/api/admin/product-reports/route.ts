import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REPORT_MODULE } from "../../../modules/product-reports"
import ProductReportService from "../../../modules/product-reports/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if ((req as any).auth_context?.actor_type !== "user") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }

  const { status, offset = "0", limit = "20" } = req.query as {
    status?: string
    offset?: string
    limit?: string
  }

  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100)
  const parsedOffset = parseInt(offset, 10) || 0

  const reportService: ProductReportService = req.scope.resolve(PRODUCT_REPORT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const filters: Record<string, unknown> = {}
  if (status) filters.status = status

  const [reports, allForCount] = await Promise.all([
    reportService.listProductReports(filters, { skip: parsedOffset, take: parsedLimit }),
    reportService.listProductReports(filters, {}),
  ])

  const count = allForCount.length

  // Batch resolve customer names
  const customerIds = [...new Set(
    (reports as any[]).map((r: any) => r.customer_id).filter(Boolean),
  )]

  let customerNames: Record<string, string> = {}
  if (customerIds.length > 0) {
    try {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name", "email"],
        filters: { id: customerIds },
      })
      for (const c of customers as any[]) {
        customerNames[c.id] =
          [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id
      }
    } catch {
      // non-critical enrichment
    }
  }

  // Batch resolve product titles
  const productIds = [...new Set(
    (reports as any[]).map((r: any) => r.product_id).filter(Boolean),
  )]

  type ProductInfo = {
    title: string
    handle: string | null
    thumbnail: string | null
    status: string
    seller_id: string | null
    seller_name: string | null
    seller_handle: string | null
  }
  let productInfoMap: Record<string, ProductInfo> = {}
  if (productIds.length > 0) {
    try {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "title", "handle", "thumbnail", "status", "seller.id", "seller.name", "seller.handle"],
        filters: { id: productIds },
      })
      for (const p of products as any[]) {
        productInfoMap[p.id] = {
          title: p.title || p.id,
          handle: p.handle ?? null,
          thumbnail: p.thumbnail ?? null,
          status: p.status ?? "draft",
          seller_id: p.seller?.id ?? null,
          seller_name: p.seller?.name ?? null,
          seller_handle: p.seller?.handle ?? null,
        }
      }
    } catch {
      // non-critical enrichment
    }
  }

  const enriched = (reports as any[]).map((r: any) => {
    const info = productInfoMap[r.product_id]
    return {
      ...r,
      customer_name: customerNames[r.customer_id] ?? r.customer_id,
      product_title: info?.title ?? r.product_id,
      product_handle: info?.handle ?? null,
      product_thumbnail: info?.thumbnail ?? null,
      product_status: info?.status ?? null,
      seller_id: info?.seller_id ?? null,
      seller_name: info?.seller_name ?? null,
      seller_handle: info?.seller_handle ?? null,
    }
  })

  return res.json({ reports: enriched, count })
}
