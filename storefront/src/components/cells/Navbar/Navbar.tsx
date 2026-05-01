import { HttpTypes } from "@medusajs/types"
import { MegaMenu } from "@/components/molecules"
import { SellNowButton } from "@/components/cells/SellNowButton/SellNowButton"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

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
        <LocalizedClientLink
          href="/categories"
          className="label-md uppercase px-4"
        >
          All Products
        </LocalizedClientLink>
        {collections.map((collection, index) => (
          <LocalizedClientLink
            key={collection.id}
            href={`/collections/${collection.handle}`}
            className={`label-md uppercase px-4${index === 0 ? " text-red-600 font-semibold" : ""}`}
          >
            {collection.title}
          </LocalizedClientLink>
        ))}
      </div>

      <SellNowButton />
    </div>
  )
}
