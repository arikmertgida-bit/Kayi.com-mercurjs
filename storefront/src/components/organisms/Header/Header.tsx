import Image from "next/image"
import { HttpTypes } from "@medusajs/types"

import { CartDropdown, MobileNavbar, Navbar } from "@/components/cells"
import { HeartIcon } from "@/icons"
import { listCategories } from "@/lib/data/categories"
import { PARENT_CATEGORIES } from "@/const"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"
import { retrieveCustomer } from "@/lib/data/customer"
import { getUserWishlists } from "@/lib/data/wishlist"
import { Wishlist } from "@/types/wishlist"
import { Badge } from "@/components/atoms"
import CountrySelector from "@/components/molecules/CountrySelector/CountrySelector"
import { listRegions } from "@/lib/data/regions"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { NavbarSearch } from "@/components/molecules"

export const Header = async () => {
  // Parallelise all independent data fetches — eliminates a ~3-request waterfall
  // and reduces total server-side blocking time to that of the slowest single fetch.
  const [user, regions, categoriesResult] = await Promise.all([
    retrieveCustomer(),
    listRegions(),
    listCategories({ headingCategories: PARENT_CATEGORIES }),
  ])

  // Wishlist depends on user — only fetch when needed
  let wishlist: Wishlist[] = []
  if (user) {
    const response = await getUserWishlists()
    wishlist = response.wishlists
  }

  const wishlistCount = wishlist?.[0]?.products.length || 0

  const { categories, parentCategories } = categoriesResult as {
    categories: HttpTypes.StoreProductCategory[]
    parentCategories: HttpTypes.StoreProductCategory[]
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex py-2 lg:px-8 px-4">
          <div className="flex items-center shrink-0">
            <MobileNavbar
              parentCategories={parentCategories}
              childrenCategories={categories}
            />
            <LocalizedClientLink href="/" className="text-2xl font-bold">
              <Image
                src="/Logo.png"
                width={126}
                height={40}
                alt="Logo"
                priority
              />
            </LocalizedClientLink>
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            <NavbarSearch />
          </div>
          <div className="flex items-center justify-end gap-2 lg:gap-4 shrink-0 py-2">
            <CountrySelector regions={regions} />
            <UserDropdown user={user} />
            {user && (
              <LocalizedClientLink href="/user/wishlist" className="relative">
                <HeartIcon size={20} />
                {Boolean(wishlistCount) && (
                  <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0">
                    {wishlistCount}
                  </Badge>
                )}
              </LocalizedClientLink>
            )}
            <CartDropdown />
          </div>
        </div>
      </header>
      <Navbar categories={categories} />
    </>
  )
}
