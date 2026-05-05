import { retrieveCustomer } from "@/lib/data/customer"
import { redirect } from "next/navigation"
import { isEmpty } from "lodash"
import { Wishlist as WishlistType } from "@/types/wishlist"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { Button } from "@/components/atoms"
import { WishlistItem } from "@/components/cells"
import { getUserWishlists } from "@/lib/data/wishlist"
import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

export default async function Wishlist() {
  const user = await retrieveCustomer()
  const t = await getTranslations('wishlist')

  let wishlist: WishlistType[] = []
  if (user) {
    const response = await getUserWishlists()
    wishlist = response.wishlists
  }

  const count = wishlist?.[0]?.products?.length || 0

  if (!user) {
    redirect("/user")
  }

  return (
    <main className="container">
      <div className="mt-6 space-y-8">
          {isEmpty(wishlist?.[0]?.products) ? (
            <div className="w-96 mx-auto flex flex-col items-center justify-center">
              <h2 className="heading-lg text-primary uppercase mb-2">
                {t('title')}
              </h2>
              <p className="text-lg text-secondary mb-6">
                {t('empty')}
              </p>
              <LocalizedClientLink href="/categories" className="w-full">
                <Button className="w-full">{t('explore')}</Button>
              </LocalizedClientLink>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h2 className="heading-lg text-primary uppercase">{t('title')}</h2>
              <div className="flex justify-between items-center">
                <p>{t('count', { count })}</p>
              </div>
              <div className="flex flex-wrap max-md:justify-center gap-4">
                {wishlist?.[0].products?.map((product) => (
                  <WishlistItem
                    key={product.id}
                    product={
                      product as HttpTypes.StoreProduct & {
                        calculated_amount: number
                        currency_code: string
                      }
                    }
                  />
                ))}
              </div>
            </div>
          )}
      </div>
    </main>
  )
}
