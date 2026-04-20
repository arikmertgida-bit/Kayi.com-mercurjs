import { _DataTable } from "../../../../components/table/data-table/data-table"
import { useRequests } from "../../../../hooks/api/requests"
import { useDataTable } from "../../../../hooks/use-data-table"
import { useRequestsTableColumns } from "./use-requests-table-columns"
import { useQueryParams } from "../../../../hooks/use-query-params"

const PAGE_SIZE = 20

export const RequestListTable = ({
  request_type,
  customColumns,
}: {
  request_type: string
  customColumns?: any
}) => {
  const { q, offset } = useQueryParams(["q", "offset"])

  const { requests, isPending, isError, error } = useRequests({
    fields: "+review",
    q,
    limit: PAGE_SIZE,
    offset: offset ? Number(offset) : 0,
  })

  const data =
    requests?.filter(({ type }: { type: string }) => type === request_type) ??
    []

  const count = data?.length || 0

  const columns = useRequestsTableColumns()

  const { table } = useDataTable({
    data,
    columns: customColumns || columns,
    count,
    enablePagination: true,
    getRowId: (row: any) => row?.id || "",
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <div>
      <_DataTable
        table={table}
        columns={customColumns || columns}
        pageSize={PAGE_SIZE}
        count={count}
        isLoading={isPending}
        pagination
        navigateTo={({ original }: any) => {
          const isAccepted = original.status === "accepted"
          return request_type === "review_remove" && !isAccepted
            ? `/reviews/${original.data.review_id}`
            : ""
        }}
        search
      />
    </div>
  )
}
