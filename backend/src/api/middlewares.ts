import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"
import { reviewValidationMiddleware } from "./reviewValidationMiddleware"

const upload = multer({ storage: multer.memoryStorage() })

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
