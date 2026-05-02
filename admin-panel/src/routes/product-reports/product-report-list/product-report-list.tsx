import { useState } from "react"
import { Link } from "react-router-dom"
import { History } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text, toast } from "@medusajs/ui"
import { formatDate } from "@lib/date"
import {
  useProductReports,
  useResolveProductReport,
  useDeleteProductReport,
  type ProductReport,
} from "@hooks/api"

const PAGE_SIZE = 20

type FilterState = "pending" | "resolved" | "dismissed" | ""

const getStatusBadge = (status: string) => {
  if (status === "pending") return <Badge color="orange">Pending</Badge>
  if (status === "resolved") return <Badge color="green">Resolved</Badge>
  if (status === "dismissed") return <Badge color="grey">Dismissed</Badge>
  return <Badge color="grey">{status}</Badge>
}

const REASON_LABELS: Record<string, string> = {
  inaccurate_product_details: "Inaccurate Product Details",
  pricing_irregularities: "Pricing Irregularities",
  prohibited_item: "Prohibited Item",
  counterfeit_trademark: "Counterfeit / Trademark Violation",
  incorrect_categorization: "Incorrect Categorization",
  inappropriate_media: "Inappropriate Media",
  dmca_violation: "DMCA / Copyright Violation",
  other: "Other",
}

export const ProductReportList = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const [filter, setFilter] = useState<FilterState>("pending")

  const { reports = [], isLoading, count = 0 } = useProductReports({
    offset: currentPage * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filter || undefined,
  })

  const { mutate: resolveReport, isPending: isResolving } = useResolveProductReport({
    onSuccess: () => {
      toast.success("Kullanıcıya bildirim gönderildi.")
    },
    onError: () => {
      toast.error("Bir hata oluştu, lütfen tekrar deneyin.")
    },
  })

  const { mutate: deleteReport, isPending: isDeleting } = useDeleteProductReport({
    onSuccess: () => {
      toast.success("Rapor silindi.")
    },
    onError: () => {
      toast.error("Bir hata oluştu, lütfen tekrar deneyin.")
    },
  })

  const isBusy = isResolving || isDeleting

  const handleAttend = (report: ProductReport) => {
    resolveReport({ id: report.id })
  }

  const handleDelete = (report: ProductReport) => {
    deleteReport({ id: report.id })
  }

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Product Reports</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Review flagged products and resolve or dismiss reports.
          </Text>
        </div>
        <div className="flex gap-2">
          {(["pending", "resolved", "dismissed", ""] as FilterState[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "primary" : "secondary"}
              size="small"
              onClick={() => {
                setCurrentPage(0)
                setFilter(f)
              }}
            >
              {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && <Text className="px-6 pb-4">Loading...</Text>}

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Ürün</Table.HeaderCell>
              <Table.HeaderCell>Satıcı</Table.HeaderCell>
              <Table.HeaderCell>Bildiren</Table.HeaderCell>
              <Table.HeaderCell>Sebep</Table.HeaderCell>
              <Table.HeaderCell>Yorum</Table.HeaderCell>
              <Table.HeaderCell>Tarih</Table.HeaderCell>
              <Table.HeaderCell>Durum</Table.HeaderCell>
              <Table.HeaderCell>İşlemler</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(reports as ProductReport[]).map((report) => (
              <Table.Row key={report.id}>
                <Table.Cell>
                  <Link
                    to={`/products/${report.product_id}`}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    {report.product_thumbnail ? (
                      <img
                        src={report.product_thumbnail}
                        alt=""
                        className="h-8 w-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-ui-bg-subtle flex-shrink-0" />
                    )}
                    <Text className="text-sm font-medium text-ui-fg-interactive truncate max-w-[160px]" title={report.product_title ?? report.product_id}>
                      {report.product_title ?? report.product_id}
                    </Text>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">{report.seller_name ?? "—"}</Text>
                  {report.seller_handle && (
                    <Text className="text-xs text-ui-fg-subtle">@{report.seller_handle}</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">{report.customer_name ?? report.customer_id}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm max-w-[180px] truncate" title={report.comment}>
                    {report.comment}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <History />
                    <Text className="text-sm">{formatDate(report.created_at)}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>{getStatusBadge(report.status)}</Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    {report.status === "pending" && (
                      <Button
                        variant="primary"
                        size="small"
                        disabled={isBusy}
                        onClick={() => handleAttend(report)}
                      >
                        İlgilenildi
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="small"
                      disabled={isBusy}
                      onClick={() => handleDelete(report)}
                    >
                      Sil
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!isLoading && (reports as ProductReport[]).length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={8} className="py-8 text-center">
                  <Text className="text-center text-ui-fg-subtle py-8">
                    No product reports found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>

        <Table.Pagination
          className="w-full"
          canNextPage={PAGE_SIZE * (currentPage + 1) < count}
          canPreviousPage={currentPage > 0}
          previousPage={() => setCurrentPage(currentPage - 1)}
          nextPage={() => setCurrentPage(currentPage + 1)}
          count={count}
          pageCount={Math.ceil(count / PAGE_SIZE) || 1}
          pageIndex={currentPage}
          pageSize={PAGE_SIZE}
        />
      </div>
    </Container>
  )
}
