import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/customer/upload",
      middlewares: [upload.array("files") as any],
    },
  ],
})
