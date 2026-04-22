import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadFilesWorkflow } from "@medusajs/core-flows"
import { MedusaError } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const files = (req as any).files as Express.Multer.File[]
  if (!files || files.length === 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: files.map((f) => ({
        filename: f.originalname,
        mimeType: f.mimetype,
        content: f.buffer.toString("binary"),
        access: "public" as const,
      })),
    },
  })

  res.json({ files: result })
}
