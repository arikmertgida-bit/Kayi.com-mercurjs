import { createColumnHelper } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { DateCell } from "../../../../components/table/table-cells/common/date-cell"
import { StatusCell } from "../../../../components/table/table-cells/common/status-cell"

const columnHelper = createColumnHelper<any>()

const getStatusColor: any = (status: string) => {
  switch (status) {
    case "pending":
      return "orange"
    case "refunded":
      return "green"
    case "withdrawn":
      return "yellow"
    case "escalated":
      return "red"
    default:
      return "orange"
  }
}

export const useOrderReturnRequestTableColumns = () => {
  const { t } = useTranslation()
  return [
    columnHelper.accessor("id", {
      header: t("requests.orderColumns.order"),
      cell: ({ row }) => `#${row.original.order.display_id}`,
    }),
    columnHelper.accessor("order.customer.first_name", {
      header: t("requests.orderColumns.customer"),
      cell: ({ row }) =>
        `${row.original.order.customer.first_name} ${row.original.order.customer.last_name}`,
    }),
    columnHelper.accessor("order.customer.email", {
      header: t("requests.orderColumns.customerEmail"),
      cell: ({ row }) => row.original.order.customer.email,
    }),
    columnHelper.accessor("customer_note", {
      header: t("requests.orderColumns.reason"),
      cell: ({ row }) => row.original.customer_note,
    }),
    columnHelper.accessor("created_at", {
      header: t("requests.orderColumns.date"),
      cell: ({ row }) => <DateCell date={row.original.created_at} />,
    }),
    columnHelper.accessor("status", {
      header: t("requests.orderColumns.status"),
      cell: ({ row }) => {
        return (
          <div className="flex h-full w-full items-center overflow-hidden">
            <span className="truncate uppercase">
              <StatusCell color={getStatusColor(row.original.status)}>
                {t(`requests.statuses.${row.original.status}`, { defaultValue: row.original.status })}
              </StatusCell>
            </span>
          </div>
        )
      },
    }),
  ]
}
