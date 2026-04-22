import { HttpTypes } from "@medusajs/types"
import { MegaMenu } from "@/components/molecules"
import { SellNowButton } from "@/components/cells/SellNowButton/SellNowButton"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

export const Navbar = ({
  megaMenuCategories,
}: {
  megaMenuCategories: HttpTypes.StoreProductCategory[]
}) => {
  return (
    <div className="hidden lg:flex border py-3 justify-between px-6 items-center">
      <div className="flex items-center gap-6">
        <MegaMenu categories={megaMenuCategories} />
        <LocalizedClientLink
          href="/categories"
          className="label-md uppercase px-4"
        >
          All Products
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/collections/firsat-urunleri"
          className="label-md uppercase px-4 text-red-600 font-semibold"
        >
          İndirimli Ürünler
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/collections/yeni-sezon"
          className="label-md uppercase px-4"
        >
          Sezonluk Ürünler
        </LocalizedClientLink>
      </div>

      <SellNowButton />
    </div>
  )
}
