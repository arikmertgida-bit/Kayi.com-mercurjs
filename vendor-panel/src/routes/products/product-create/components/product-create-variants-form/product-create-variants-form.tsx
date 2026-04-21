import { useMemo } from "react"
import { UseFormReturn } from "react-hook-form"
import { HttpTypes } from "@medusajs/types"

import { ProductCreateVariantsSection } from "../product-create-details-form/components/product-create-details-variant-section"
import { ProductCreateSchemaType } from "../../types"
import { useRegions } from "../../../../../hooks/api/regions"

type ProductCreateVariantsFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  store?: HttpTypes.AdminStore
}

export const ProductCreateVariantsForm = ({
  form,
}: ProductCreateVariantsFormProps) => {
  const { regions } = useRegions({ limit: 9999 })

  const priceColumns = useMemo(
    () =>
      (regions ?? []).map((r) => ({
        key: r.id,
        label: `${r.name} (${r.currency_code.toUpperCase()})`,
      })),
    [regions]
  )

  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        {/* Varyantlar */}
        <ProductCreateVariantsSection form={form} priceColumns={priceColumns} />
      </div>
    </div>
  )
}
