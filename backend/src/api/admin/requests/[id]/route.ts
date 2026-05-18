import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string }

  const requestsModuleService = req.scope.resolve<{
    deleteRequests: (ids: string[]) => Promise<void>
  }>("requests")
  await requestsModuleService.deleteRequests([id])

  res.json({ id, object: "request", deleted: true })
}
