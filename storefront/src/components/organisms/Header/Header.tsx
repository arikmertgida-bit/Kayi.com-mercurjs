import Image from "next/image"
import { HttpTypes } from "@medusajs/types"

import { CartDropdown, MobileNavbar, Navbar } from "@/components/cells"
import { HeartIcon } from "@/icons"
import { listCategories, listMegaMenuCategories } from "@/lib/data/categories"
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
  const [user, regions, categoriesResult, megaMenuCategories] = await Promise.all([
    retrieveCustomer(),
    listRegions(),
    listCategories({ headingCategories: PARENT_CATEGORIES }),
    listMegaMenuCategories(),
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
          {/* Logo – always visible */}
          <div className="flex items-center shrink-0">
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
          {/* Search – desktop only (centre) */}
          <div className="hidden lg:flex flex-1 items-center justify-center px-4">
            <NavbarSearch />
          </div>
          {/* Right icons – always visible; MobileNavbar toggle appended for mobile */}
          <div className="flex items-center justify-end gap-2 lg:gap-4 shrink-0 py-2 ml-auto lg:ml-0">
            <CountrySelector regions={regions} />
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
            <UserDropdown user={user} />
            {/* Toggle menu – only below lg */}
            <MobileNavbar
              parentCategories={parentCategories}
              childrenCategories={categories}
              menuCategories={megaMenuCategories}
            />
          </div>
        </div>
      </header>
      {/* Mobile search row – only below lg, full width */}
      <div className="lg:hidden bg-white shadow-sm border-t px-4 py-2">
        <NavbarSearch />
      </div>
      <Navbar megaMenuCategories={megaMenuCategories} />
    </>
  )
}
