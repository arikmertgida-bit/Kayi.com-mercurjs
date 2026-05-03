import { HttpTypes } from "@medusajs/types"
import { MegaMenu } from "@/components/molecules"
import { SellNowButton } from "@/components/cells/SellNowButton/SellNowButton"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import NavbarLinks from "./NavbarLinks"

export const Navbar = ({
  megaMenuCategories,
  collections = [],
}: {
  megaMenuCategories: HttpTypes.StoreProductCategory[]
  collections?: HttpTypes.StoreCollection[]
}) => {
  return (
    <div className="hidden lg:flex border py-3 justify-between px-6 items-center">
      <div className="flex items-center gap-6">
        <MegaMenu categories={megaMenuCategories as any} />
        <NavbarLinks collections={collections} />
      </div>

      <SellNowButton />
    </div>
  )
}
