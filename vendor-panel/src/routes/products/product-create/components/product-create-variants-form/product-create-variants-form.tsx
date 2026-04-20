import { useMemo } from "react"
import { UseFormReturn } from "react-hook-form"
import { HttpTypes } from "@medusajs/types"

import { ProductCreateVariantsSection } from "../product-create-details-form/components/product-create-details-variant-section"
import { ProductCreateSchemaType } from "../../types"

type ProductCreateVariantsFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  store?: HttpTypes.AdminStore
}

export const ProductCreateVariantsForm = ({
  form,
  store,
}: ProductCreateVariantsFormProps) => {
  const currencyCodes = useMemo(
    () =>
      (store?.supported_currencies?.map((c) => c.currency_code) ?? []).filter(
        (cc) => cc === "try"
      ),
    [store]
  )

  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        {/* Varyantlar */}
        <ProductCreateVariantsSection form={form} currencyCodes={currencyCodes} />
      </div>
    </div>
  )
}
