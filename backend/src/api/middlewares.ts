import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"
import { reviewValidationMiddleware } from "./reviewValidationMiddleware"

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
  ],
})
