import { ProductsList, ProductsPagination } from "@/components/organisms"
import { PRODUCT_LIMIT } from "@/const"
import { getSellerProducts } from "@/lib/data/seller"

export const SellerProductListing = async ({
  seller_handle,
  locale,
  page = 1,
}: {
  seller_handle: string
  locale: string
  page?: number
}) => {
  const { products, count } = await getSellerProducts(seller_handle, locale, page)
  const pages = Math.ceil(count / PRODUCT_LIMIT) || 1

  if (!products.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-ui-fg-subtle">Bu satıcının henüz yayınlanmış ürünü bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="my-4 label-md">{count} ürün</div>
      <div className="grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4">
        <ProductsList products={products} />
      </div>
      <ProductsPagination pages={pages} />
    </div>
  )
}
