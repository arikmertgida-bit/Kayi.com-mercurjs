import { Outlet } from "react-router-dom"
import { ProductFilteredListTable } from "../product-list/components/product-list-table/product-filtered-list-table"

export const ProductSingleList = () => {
  return (
    <div className="flex flex-1 flex-col gap-y-2">
      <ProductFilteredListTable
        productType="single"
        heading="Tekil Ürünler"
        createTo="/products/single/create-single"
        createLabel="Tekil Ürün Ekle"
      />
      <Outlet />
    </div>
  )
}
