import { SellerTabs } from "@/components/organisms"
import { SellerPageHeader } from "@/components/sections"
import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import { getSellerByHandle, getFollowStatus, getSellerCategories, getSellerProductCount } from "@/lib/data/seller"
import { SellerProps } from "@/types/seller"

export default async function SellerReviewsPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params

  const seller = (await getSellerByHandle(handle)) as SellerProps

  const [user, followStatusRaw, categories, region, productCount] = await Promise.all([
    retrieveCustomer(),
    getFollowStatus(handle),
    getSellerCategories(handle),
    getRegion(locale),
    getSellerProductCount(handle),
  ])

  const followStatus = followStatusRaw ?? { following: false, followers_count: 0 }
  const currency_code = region?.currency_code || "usd"
  const tab = "reviews"

  return (
    <>
      <SellerPageHeader header seller={seller} user={user} followStatus={followStatus} />
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
      />
      </main>
    </>
  )
}
