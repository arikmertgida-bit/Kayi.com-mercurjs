import { useTranslation } from "react-i18next"
import { RouteFocusModal } from "../../../components/modals"
import { useSalesChannels } from "../../../hooks/api"
import { useStore } from "../../../hooks/api/store"
import { ProductCreateForm } from "../product-create/components/product-create-form/product-create-form"

export const ProductCreateSingle = () => {
  const { t } = useTranslation()

  const { store, isPending: isStorePending } = useStore()
  const { sales_channels, isPending: isSalesChannelPending } = useSalesChannels()

  const ready =
    !!store && !isStorePending && !!sales_channels && !isSalesChannelPending

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.create.single.title", "Tekil Ürün Oluştur")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">
          {t("products.create.single.description", "Tekil ürün bilgilerini girin")}
        </span>
      </RouteFocusModal.Description>
      {ready && (
        <ProductCreateForm
          defaultChannel={sales_channels[0]}
          store={store}
          initialProductType="single"
        />
      )}
    </RouteFocusModal>
  )
}
