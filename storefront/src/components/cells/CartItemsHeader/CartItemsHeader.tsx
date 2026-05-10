import { Divider } from "@/components/atoms"
import { SingleProductSeller } from "@/types/product"
import { format } from "date-fns"
import { SellerAvatar } from "../SellerAvatar/SellerAvatar"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { useTranslations } from "next-intl"
import { getVendorImage, resolveOwnerMember } from "@/lib/utils/get-vendor-image"

export const CartItemsHeader = ({
  seller,
}: {
  seller: SingleProductSeller
}) => {
  const t = useTranslations('cart');
  return (
    <LocalizedClientLink href={`/sellers/${seller.handle}`}>
      <div className="border rounded-sm p-4 flex gap-4 items-center">
        <SellerAvatar photo={getVendorImage({ memberPhoto: resolveOwnerMember(seller.members)?.photo, sellerPhoto: seller.photo })} size={32} alt={seller.name} />

        <div className="lg:flex gap-2">
          <p className="uppercase heading-xs">{seller.name}</p>
          {seller.id !== "fleek" && (
            <div className="flex items-center gap-2">
              <Divider square />
              <p className="label-md text-secondary">
                {t('joined')} {format(seller.created_at || "", "yyyy-MM-dd")}
              </p>
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
