import { SellerTabs } from "@/components/organisms"
import { SellerPageHeader } from "@/components/sections"
import { SellerMessengerWidget } from "@/components/cells/SellerMessengerWidget/SellerMessengerWidget"
import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import { getSellerByHandle, getFollowStatus, getSellerCategories } from "@/lib/data/seller"
import { sdk } from "@/lib/config"
import { SellerProps } from "@/types/seller"

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; locale: string }>
  searchParams?: Promise<Record<string, string>>
}) {
  const { handle, locale } = await params
  const sp = searchParams ? await searchParams : {}
  const page = Math.max(1, parseInt(sp["page"] || "1", 10))

  const seller = (await getSellerByHandle(handle)) as SellerProps

  if (!seller) {
    return null
  }

  const [user, followStatusRaw, categories, region] = await Promise.all([
    retrieveCustomer(),
    getFollowStatus(handle),
    getSellerCategories(handle),
    getRegion(locale),
  ])

  const followStatus = followStatusRaw ?? { following: false, followers_count: 0 }

  const currency_code = region?.currency_code || "usd"
  const productCount = seller.products?.length || 0
  const tab = "products"

  // Build a map of product_id -> { title, thumbnail } for reviews that reference a product
  const productReviewIds = (seller.reviews ?? [])
    .filter((r) => r !== null && r.reference === "product" && r.reference_id)
    .map((r) => r.reference_id as string)

  const uniqueProductIds = [...new Set(productReviewIds)]

  let productMap: Record<string, { title: string; thumbnail: string | null }> = {}

  if (uniqueProductIds.length > 0) {
    try {
      const { products } = await sdk.client.fetch<{ products: { id: string; title: string; thumbnail: string | null }[] }>(
        "/store/products",
        {
          method: "GET",
          query: {
            id: uniqueProductIds,
            fields: "id,title,thumbnail",
            limit: uniqueProductIds.length,
          },
        }
      )
      productMap = Object.fromEntries(products.map((p) => [p.id, { title: p.title, thumbnail: p.thumbnail ?? null }]))
    } catch {
      // productMap stays empty — reviews will just show without product info
    }
  }

  return (
    <>
      <SellerPageHeader seller={seller} user={user} followStatus={followStatus} />
      <main className="container">
      <SellerTabs
        tab={tab}
        seller_id={seller.id}
        seller_handle={seller.handle}
        locale={locale}
        currency_code={currency_code}
        seller={seller}
        categories={categories}
        productCount={productCount}
        productMap={productMap}
        page={page}
      />
      </main>
      <SellerMessengerWidget
        seller={seller}
        currentUserId={user?.id ?? null}
        currentUser={user ? {
          id: user.id,
          name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Müşteri",
        } : null}
      />
    </>
  )
}
