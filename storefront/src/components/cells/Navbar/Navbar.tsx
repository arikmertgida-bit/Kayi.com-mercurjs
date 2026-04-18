import { HttpTypes } from "@medusajs/types"
import { CategoryNavbar } from "@/components/molecules"
import { SellNowButton } from "@/components/cells/SellNowButton/SellNowButton"

export const Navbar = ({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) => {
  return (
    <div className="flex border py-4 justify-between px-6">
      <div className="hidden md:flex items-center">
        <CategoryNavbar categories={categories} />
      </div>

      <SellNowButton />
    </div>
  )
}
