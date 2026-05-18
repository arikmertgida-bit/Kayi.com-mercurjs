import { defineMiddlewares } from "@medusajs/framework/http"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import type { MedusaNextFunction } from "@medusajs/framework/http"
import multer from "multer"
import { reviewValidationMiddleware } from "./reviewValidationMiddleware"
import { checkResourceOwnershipByResourceId, checkCustomerResourceOwnershipByResourceId } from "@mercurjs/framework"
import sellerReturnRequest from "@mercurjs/requests/links/seller-return-request"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILE_COUNT = 12

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILE_COUNT,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Desteklenmeyen dosya türü. İzin verilenler: ${ALLOWED_MIME_TYPES.join(", ")}`))
    }
  },
})

// Satıcı başına promosyon/kampanya oluşturma hız sınırı.
// Pencere: 60 saniye | Maksimum: 20 istek
// Memory-store: tek instance için yeterli; multi-instance dağıtımda Redis'e taşı.
const RATE_WINDOW_MS = 60_000
const RATE_MAX_REQUESTS = 20
const vendorPromoRateMap = new Map<string, { count: number; resetAt: number }>()

function vendorPromoRateLimiter(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void {
  const actorId = req.auth_context?.actor_id ?? req.ip ?? "unknown"
  const now = Date.now()
  const entry = vendorPromoRateMap.get(actorId)

  if (!entry || now > entry.resetAt) {
    vendorPromoRateMap.set(actorId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return next()
  }

  entry.count++
  if (entry.count > RATE_MAX_REQUESTS) {
    res.status(429).json({
      message: "Çok fazla istek gönderdiniz. Lütfen 1 dakika sonra tekrar deneyin.",
    })
    return
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/reviews",
      middlewares: [reviewValidationMiddleware as any],
    },
    {
      method: ["POST"],
      matcher: "/store/customer/upload",
      middlewares: [upload.array("files") as any],
      bodyParser: false,
    },
    {
      method: ["POST"],
      matcher: "/vendor/products/import",
      middlewares: [],
      bodyParser: false,
    },
    {
      method: ["POST"],
      matcher: "/vendor/promotions",
      middlewares: [vendorPromoRateLimiter as any],
    },
    {
      method: ["POST"],
      matcher: "/vendor/campaigns",
      middlewares: [vendorPromoRateLimiter as any],
    },
    {
      method: ["POST"],
      matcher: "/vendor/kayi-campaigns",
      middlewares: [vendorPromoRateLimiter as any],
    },
    {
      method: ["POST"],
      matcher: "/vendor/return-request/:id/approve",
      middlewares: [
        checkResourceOwnershipByResourceId({
          entryPoint: sellerReturnRequest.entryPoint,
          filterField: "order_return_request_id",
        }) as any,
      ],
    },
    {
      method: ["POST"],
      matcher: "/vendor/return-request/:id/mark-shipped",
      middlewares: [
        checkResourceOwnershipByResourceId({
          entryPoint: sellerReturnRequest.entryPoint,
          filterField: "order_return_request_id",
        }) as any,
      ],
    },
    {
      method: ["POST"],
      matcher: "/vendor/return-request/:id/mark-received",
      middlewares: [
        checkResourceOwnershipByResourceId({
          entryPoint: sellerReturnRequest.entryPoint,
          filterField: "order_return_request_id",
        }) as any,
      ],
    },
    {
      method: ["GET"],
      matcher: "/vendor/return-request/:id/shipment",
      middlewares: [
        checkResourceOwnershipByResourceId({
          entryPoint: sellerReturnRequest.entryPoint,
          filterField: "order_return_request_id",
        }) as any,
      ],
    },
    {
      method: ["GET"],
      matcher: "/store/return-request/:id/shipment",
      middlewares: [
        checkCustomerResourceOwnershipByResourceId({
          entryPoint: "order_return_request",
        }) as any,
      ],
    },
  ],
})
