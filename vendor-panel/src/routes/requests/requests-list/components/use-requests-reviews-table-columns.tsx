import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { DateCell } from "../../../../components/table/table-cells/common/date-cell"
import { StatusCell } from "../../../../components/table/table-cells/request/status-cell"
import { RequestsActions } from "./requests-actions"

const columnHelper = createColumnHelper<any>()

export const useRequestsReviewsTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("data.review_id", {
        header: t("requests.reviewColumns.review"),
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("data.reason", {
        header: t("requests.reviewColumns.reason"),
        cell: ({ row }) => {
          const rawReason: string = row.original?.data.reason || ""
          const reasonKey = rawReason.split(" comment: ")[0].trim()
          const translatedReason = t(`reviews.report.reasons.${reasonKey}` as any, {
            defaultValue: reasonKey,
          })

          return <p className="truncate max-w-[360px]">{translatedReason}</p>
        },
      }),
      columnHelper.accessor("created_at", {
        header: t("requests.reviewColumns.date"),
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.accessor("status", {
        header: t("requests.reviewColumns.status"),
        cell: ({ getValue }) => <StatusCell status={getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          const request = row.original

          if (request.status !== "pending") return null

          return <RequestsActions request={request} />
        },
      }),
    ],
    [t]
  )
}
