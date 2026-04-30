import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { getJob } from "../../../../../../lib/import/import-store.js"
import { presignedGetUrl } from "../../../../../../lib/minio-client.js"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const jobId = req.params.id as string

  const seller = await fetchSellerByAuthActorId(
    (req as any).auth_context?.actor_id,
    req.scope
  )
  if (!seller) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Seller not found")
  }

  const job = getJob(jobId)
  if (!job) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Job not found")
  }
  if (job.seller_id !== seller.id) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Access denied")
  }

  // If job is done and there are errors, provide a short-lived download URL
  let error_log_url: string | undefined
  if (job.error_log_path && job.status === "done") {
    try {
      error_log_url = await presignedGetUrl(job.error_log_path, 3600)
    } catch {
      // Non-fatal
    }
  }

  res.status(200).json({ job: { ...job, error_log_url } })
}
