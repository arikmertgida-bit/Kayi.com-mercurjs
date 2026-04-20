import { Outlet } from "react-router-dom"
import { ProductFilteredListTable } from "../product-list/components/product-list-table/product-filtered-list-table"

export const ProductVariantList = () => {
  return (
    <div className="flex flex-1 flex-col gap-y-2">
      <ProductFilteredListTable
        productType="variant"
        heading="Varyasyonlu Ürünler"
        createTo="/products/variants/create-with-variants"
        createLabel="Varyasyonlu Ürün Ekle"
      />
      <Outlet />
    </div>
  )
}
