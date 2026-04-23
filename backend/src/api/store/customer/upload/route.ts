import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const files = (req as any).files as any[]
  if (!files || files.length === 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  }

  const fileService = req.scope.resolve(Modules.FILE)

  const result = await fileService.createFiles(
    files.map((f: any) => ({
      filename: f.originalname,
      mimeType: f.mimetype,
      content: f.buffer.toString("base64"),
      access: "public" as const,
    }))
  )

  res.json({ files: result })
}
