import { ProductDetails, ProductGallery, ProductReviews } from "@/components/organisms"
import { ProductGalleryClient } from "@/components/organisms/ProductGallery/ProductGalleryClient"
import { StickyAddToCart } from "@/components/cells/StickyAddToCart/StickyAddToCart"
import { ProductVariantProvider } from "@/components/providers/ProductVariant/ProductVariantProvider"
import { listProducts } from "@/lib/data/products"
import { HomeProductSection } from "../HomeProductSection/HomeProductSection"
import NotFound from "@/app/not-found"
import { Suspense } from "react"

export const ProductDetailsPage = async ({
  handle,
  locale,
}: {
  handle: string
  locale: string
}) => {
  const prod = await listProducts({
    countryCode: locale,
    queryParams: { handle: [handle], limit: 1 },
    forceCache: true,
  }).then(({ response }) => response.products[0])

  if (!prod) return null

  if (prod.seller?.store_status === "SUSPENDED") {
    return NotFound()
  }

  return (
    <ProductVariantProvider product={prod as any}>
      <div className="flex flex-col md:flex-row lg:gap-12">
        <div className="md:w-1/2 md:px-2 relative">
          <Suspense fallback={<ProductGallery images={prod?.images || []} />}>
            <ProductGalleryClient images={prod?.images || []} />
          </Suspense>
        </div>
        <div className="md:w-1/2 md:px-2">
          <ProductDetails product={prod} locale={locale} />
        </div>
      </div>
      <div className="my-8">
        <ProductReviews product={prod as any} locale={locale} />
      </div>
      <div className="my-8">
        <HomeProductSection
          heading="More from this seller"
          products={prod.seller?.products}
          seller_handle={prod.seller?.handle}
          locale={locale}
        />
      </div>
      {/* Mobil sticky "Sepete Ekle" barı */}
      <StickyAddToCart locale={locale} />
    </ProductVariantProvider>
  )
}
