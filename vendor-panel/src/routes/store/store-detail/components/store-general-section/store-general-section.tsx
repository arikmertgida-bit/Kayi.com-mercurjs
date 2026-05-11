import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { StoreVendor } from "../../../../../types/user"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Pencil } from "@medusajs/icons"
import { ImageAvatar } from "../../../../../components/common/image-avatar"
import { useSellerRegions } from "../../../../../hooks/api/use-seller-regions"

export const StoreGeneralSection = ({ seller }: { seller: StoreVendor }) => {
  const { t } = useTranslation()
  const { sellerRegions, selectedIds } = useSellerRegions()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("store.domain")}</Heading>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Pencil />,
                  label: t("actions.edit"),
                  to: "edit",
                },
              ],
            },
          ]}
        />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4 items-center">
        <Text size="small" leading="compact" weight="plus">
          {t("store.logo")}
        </Text>
        <ImageAvatar src={seller.photo || "/logo.svg"} size={8} rounded />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.name")}
        </Text>
        <Text size="small" leading="compact">
          {seller.name}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.email")}
        </Text>
        <Text size="small" leading="compact">
          {seller.email}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.phone")}
        </Text>
        <Text size="small" leading="compact">
          {seller.phone}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.description")}
        </Text>
        <Text size="small" leading="compact">
          {seller.description || "-"}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("store.salesRegions")}
        </Text>
        <div className="flex flex-col gap-y-1">
          {selectedIds.length === 0 ? (
            <Text size="small" leading="compact" className="text-ui-fg-muted">
              {t("store.salesRegionsNone")}
            </Text>
          ) : (
            sellerRegions.map((region) => (
              <Text key={region.id} size="small" leading="compact">
                {region.name}{" "}
                <span className="text-ui-fg-muted">
                  ({region.currency_code?.toUpperCase()})
                </span>
              </Text>
            ))
          )}
        </div>
      </div>
    </Container>
  )
}
