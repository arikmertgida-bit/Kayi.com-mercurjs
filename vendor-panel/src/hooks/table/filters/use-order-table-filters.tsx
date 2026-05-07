import { useTranslation } from "react-i18next"

import type { Filter } from "../../../components/table/data-table"

export const useOrderTableFilters = (): Filter[] => {
  const { t } = useTranslation()

  const fulfillmentStatusFilter: Filter = {
    key: "fulfillment_status",
    label: t("orders.fulfillment.statusLabel"),
    type: "select",
    multiple: false,
    options: [
      { label: t("orders.fulfillment.status.notFulfilled"), value: "not_fulfilled" },
      { label: t("orders.fulfillment.status.fulfilled"), value: "fulfilled" },
      { label: t("orders.fulfillment.status.partiallyFulfilled"), value: "partially_fulfilled" },
      { label: t("orders.fulfillment.status.returned"), value: "returned" },
      { label: t("orders.fulfillment.status.canceled"), value: "canceled" },
    ],
  }

  const dateFilters: Filter[] = [
    { label: t("fields.createdAt"), key: "created_at" },
    { label: t("fields.updatedAt"), key: "updated_at" },
  ].map((f) => ({
    key: f.key,
    label: f.label,
    type: "date",
  }))

  return [fulfillmentStatusFilter, ...dateFilters]
}

