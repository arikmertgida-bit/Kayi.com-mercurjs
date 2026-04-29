import { useState } from "react"
import { History, Photo, Trash, Check } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text, usePrompt, toast } from "@medusajs/ui"
import { formatDate } from "@lib/date"
import {
  useReviewImageReports,
  useResolveImageReport,
  ReviewImageReport,
} from "@hooks/api/review-image-reports"

const PAGE_SIZE = 20

type FilterState = "pending" | "resolved" | ""

const getStatusBadge = (status: string) => {
  if (status === "pending") return <Badge color="orange">Pending</Badge>
  if (status === "resolved") return <Badge color="green">Resolved</Badge>
  return <Badge color="grey">{status}</Badge>
}

export const ReportedImageList = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const [filter, setFilter] = useState<FilterState>("pending")

  const { reports = [], isLoading, count = 0 } = useReviewImageReports({
    offset: currentPage * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filter || undefined,
  })

  const { mutate: resolveReport, isPending: isResolving } = useResolveImageReport({
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "hide"
          ? "Image removed successfully."
          : "Image published successfully."
      )
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.")
    },
  })

  const prompt = usePrompt()

  const handleAction = async (report: ReviewImageReport, action: "hide" | "publish") => {
    const confirmed = await prompt({
      title: action === "hide" ? "Remove Image" : "Publish Image",
      description:
        action === "hide"
          ? "This will permanently hide the image from all users. Continue?"
          : "This will make the image visible to all users again. Continue?",
      confirmText: action === "hide" ? "Remove" : "Publish",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    resolveReport({ id: report.id, action })
  }

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Reported Images</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Review flagged images and decide to remove or publish them.
          </Text>
        </div>
        <div className="flex gap-2">
          {(["pending", "resolved", ""] as FilterState[]).map((f) => (
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
              <Table.HeaderCell>Image</Table.HeaderCell>
              <Table.HeaderCell>Reported By</Table.HeaderCell>
              <Table.HeaderCell>Reason</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(reports as ReviewImageReport[]).map((report) => (
              <Table.Row key={report.id}>
                <Table.Cell>
                  {report.image?.url ? (
                    <a href={report.image.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={report.image.url}
                        alt="Reported"
                        className="size-12 object-cover rounded-sm border border-ui-border-base hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ) : (
                    <div className="size-12 bg-ui-bg-subtle rounded-sm flex items-center justify-center">
                      <Photo className="text-ui-fg-muted" />
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">{report.customer_name ?? report.customer_id}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm max-w-[200px] truncate" title={report.reason}>
                    {report.reason}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <History />
                    <Text className="text-sm">{formatDate(report.created_at)}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(report.status)}
                    {report.action_taken && (
                      <Badge color="grey" className="text-xs">
                        {report.action_taken}
                      </Badge>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {report.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="small"
                        disabled={isResolving}
                        onClick={() => handleAction(report, "hide")}
                      >
                        <Trash className="mr-1" />
                        Remove
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={isResolving}
                        onClick={() => handleAction(report, "publish")}
                      >
                        <Check className="mr-1" />
                        Publish
                      </Button>
                    </div>
                  )}
                  {report.status === "resolved" && (
                    <Text className="text-sm text-ui-fg-subtle">Resolved</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
            {!isLoading && reports.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={6}>
                  <Text className="text-center text-ui-fg-subtle py-8">
                    No reported images found.
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
