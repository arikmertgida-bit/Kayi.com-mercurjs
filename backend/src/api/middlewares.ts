import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"
import { reviewValidationMiddleware } from "./reviewValidationMiddleware"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILE_COUNT = 12

const IMPORT_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/xml",
  "application/xml",
  "application/rss+xml",
  // Some OS/browsers send octet-stream for unknown types
  "application/octet-stream",
]
const IMPORT_MAX_SIZE = 20 * 1024 * 1024 // 20MB

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

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMPORT_MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Accept by MIME or fall back to extension check
    const ext = (file.originalname ?? "").split(".").pop()?.toLowerCase() ?? ""
    const allowedExts = ["csv", "xlsx", "xls", "xml", "tsv"]
    if (IMPORT_MIME_TYPES.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error("Desteklenmeyen dosya türü. İzin verilenler: CSV, Excel (.xlsx/.xls), XML"))
    }
  },
})

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
      middlewares: [importUpload.single("file") as any],
      bodyParser: false,
    },
  ],
})
