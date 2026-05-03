import { HomeSlider } from "@/components/organisms/HomeProductsCarousel/HomeSlider"
import { getCollectionByHandle } from "@/lib/data/collections"
import { listProducts } from "@/lib/data/products"
import { HttpTypes } from "@medusajs/types"

export const CollectionProductSection = async ({
  heading,
  collectionHandle,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr",
  allProductsHref,
}: {
  heading?: string
  collectionHandle: string
  locale?: string
  allProductsHref?: string
}) => {
  const collection = await getCollectionByHandle(collectionHandle)
  if (!collection) return null

  const {
    response: { products },
  } = await listProducts({
    countryCode: locale,
    collection_id: collection.id,
    queryParams: { limit: 10, order: "-created_at" },
    forceCache: true,
  })

  if (!products.length) return null

  return (
    <section className="py-4 w-full">
      <HomeSlider
        heading={heading ?? collection.title}
        initialProducts={products as HttpTypes.StoreProduct[]}
        allProductsHref={allProductsHref ?? `/collections/${collectionHandle}`}
      />
    </section>
  )
}
