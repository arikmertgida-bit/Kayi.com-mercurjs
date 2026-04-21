import { SellerTabs } from "@/components/organisms"
import { SellerPageHeader } from "@/components/sections"
import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import { getSellerByHandle, getFollowStatus, getSellerCategories } from "@/lib/data/seller"
import { SellerProps } from "@/types/seller"

export default async function SellerPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params

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

  return (
    <main className="container">
      <SellerPageHeader seller={seller} user={user} followStatus={followStatus} />
      <SellerTabs
        tab={tab}
        seller_id={seller.id}
        seller_handle={seller.handle}
        locale={locale}
        currency_code={currency_code}
        seller={seller}
        categories={categories}
        productCount={productCount}
      />
    </main>
  )
}
