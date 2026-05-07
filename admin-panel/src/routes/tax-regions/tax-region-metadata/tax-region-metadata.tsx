import { useParams } from "react-router-dom"

import { HttpTypes } from "@medusajs/types"
import { useTaxRegion, useUpdateTaxRegion } from "../../../hooks/api"
import { MetadataForm } from "../../../components/forms/metadata-form"
import { RouteDrawer } from "../../../components/modals"

export const TaxRegionMetadata = () => {
  const { id } = useParams()

  const { tax_region, isPending, isError, error } = useTaxRegion(id!)
  const { mutateAsync, isPending: isMutating } = useUpdateTaxRegion(id!)

  if (isError) {
    throw error
  }

  const handleUpdate: (
    params: { metadata?: Record<string, any> | null },
    callbacks?: { onSuccess?: () => void; onError?: (error: any) => void }
  ) => Promise<any> = (params, callbacks) =>
    mutateAsync(params as HttpTypes.AdminUpdateTaxRegion, { onSuccess: callbacks?.onSuccess, onError: callbacks?.onError })

  return (
    <RouteDrawer>
      <MetadataForm
        isPending={isPending}
        isMutating={isMutating}
        hook={handleUpdate}
        metadata={tax_region?.metadata}
      />
    </RouteDrawer>
  )
}
