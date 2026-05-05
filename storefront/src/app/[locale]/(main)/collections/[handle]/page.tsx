import NotFound from "@/app/not-found"
import { Breadcrumbs } from "@/components/atoms"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { MeiliProductsListing, ProductListing } from "@/components/sections"
import { getCollectionByHandle } from "@/lib/data/collections"
import { listMegaMenuCategories } from "@/lib/data/categories"
import { getRegion } from "@/lib/data/regions"
import isBot from "@/lib/helpers/isBot"
import { headers } from "next/headers"
import { Suspense } from "react"

const MEILISEARCH_HOST = process.env.NEXT_PUBLIC_MEILISEARCH_HOST

const SingleCollectionsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; locale: string }>
  searchParams?: Promise<Record<string, string>>
}) => {
  const { handle, locale } = await params
  const sp = searchParams ? await searchParams : {}
  const page = Math.max(1, parseInt(sp["page"] || "1", 10))

  const ua = (await headers()).get("user-agent") || ""
  const bot = isBot(ua)
  const collection = await getCollectionByHandle(handle)

  if (!collection) return <NotFound />

  const currency_code = (await getRegion(locale))?.currency_code || "usd"
  const megaMenuCategories = await listMegaMenuCategories().catch(() => [])

  const breadcrumbsItems = [
    {
      path: collection.handle,
      label: collection.title,
    },
  ]

  return (
    <main className="container">
      <div className="hidden md:block mb-2">
        <Breadcrumbs items={breadcrumbsItems} />
      </div>

      <Suspense fallback={<ProductListingSkeleton />}>
        {bot || !MEILISEARCH_HOST ? (
          <ProductListing collection_id={collection.id} showSidebar page={page} />
        ) : (
          <MeiliProductsListing
            collection_id={collection.id}
            locale={locale}
            currency_code={currency_code}
            initialCategories={megaMenuCategories}
          />
        )}
      </Suspense>
    </main>
  )
}

export default SingleCollectionsPage
