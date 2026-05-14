import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge, Button, Container, Heading, Input, Label, Table, Text, toast } from "@medusajs/ui"
import {
  usePendingPromotions,
  useApprovePromotion,
  useRejectPromotion,
  type PendingPromotion,
} from "../../../hooks/api/promotions"

const PAGE_SIZE = 20

interface RejectState {
  id: string
  reason: string
}

export const PromotionPendingList = () => {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(0)
  const [rejectState, setRejectState] = useState<RejectState | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)

  const {
    promotions = [],
    count = 0,
    isLoading,
  } = usePendingPromotions({
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
  })

  const { mutate: approve, isPending: isApproving } = useApprovePromotion({
    onSuccess: () => {
      toast.success(t("promotions.pendingApproval.toasts.approveSuccess"))
    },
    onError: () => {
      toast.error(t("promotions.pendingApproval.toasts.approveFail"))
    },
  })

  const { mutate: reject, isPending: isRejecting } = useRejectPromotion({
    onSuccess: () => {
      toast.success(t("promotions.pendingApproval.toasts.rejectSuccess"))
      setRejectState(null)
      setReasonError(null)
    },
    onError: () => {
      toast.error(t("promotions.pendingApproval.toasts.rejectFail"))
    },
  })

  const isBusy = isApproving || isRejecting

  const handleApprove = (promotion: PendingPromotion) => {
    approve({ id: promotion.id })
  }

  const handleRejectOpen = (promotion: PendingPromotion) => {
    setRejectState({ id: promotion.id, reason: "" })
    setReasonError(null)
  }

  const handleRejectCancel = () => {
    setRejectState(null)
    setReasonError(null)
  }

  const handleRejectConfirm = () => {
    if (!rejectState) return

    if (rejectState.reason.trim().length < 5) {
      setReasonError(t("promotions.pendingApproval.rejectModal.reasonMinLength"))
      return
    }

    reject({ id: rejectState.id, reason: rejectState.reason.trim() })
  }

  const getDiscountLabel = (promotion: PendingPromotion): string => {
    const method = promotion.application_method
    if (!method) return "—"
    const value = method.value !== null && method.value !== undefined ? method.value : "—"
    const type = method.type === "percentage" ? "%" : ""
    return type ? `${value}${type}` : `${value}`
  }

  const stripNamespace = (code: string, sellerId?: string): string => {
    if (sellerId) {
      const prefix = `KAYI-${sellerId}-`
      if (code.startsWith(prefix)) return code.slice(prefix.length)
    }
    // Fallback: strip "KAYI-<anything>-" prefix (two leading hyphen-separated segments).
    const match = /^KAYI-[^-]+-(.+)$/.exec(code)
    return match ? match[1] : code
  }

  const pageCount = Math.ceil(count / PAGE_SIZE) || 1

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("promotions.pendingApproval.domain")}</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            {count > 0
              ? `${count} ${t("promotions.pendingApproval.domain").toLowerCase()}`
              : t("promotions.pendingApproval.noRecords")}
          </Text>
        </div>
      </div>

      {rejectState && (
        <div className="mx-6 mb-4 rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
          <Text className="text-sm font-medium mb-2">
            {t("promotions.pendingApproval.rejectModal.title")}
          </Text>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason" className="text-sm">
              {t("promotions.pendingApproval.rejectModal.reasonLabel")}
            </Label>
            <Input
              id="reject-reason"
              value={rejectState.reason}
              placeholder={t("promotions.pendingApproval.rejectModal.reasonPlaceholder")}
              onChange={(e) => {
                setRejectState({ ...rejectState, reason: e.target.value })
                if (reasonError) setReasonError(null)
              }}
            />
            {reasonError && (
              <Text className="text-xs text-ui-fg-error">{reasonError}</Text>
            )}
            <div className="flex gap-2 mt-1">
              <Button
                variant="primary"
                size="small"
                disabled={isBusy}
                onClick={handleRejectConfirm}
              >
                {t("promotions.pendingApproval.actions.confirmReject")}
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={isBusy}
                onClick={handleRejectCancel}
              >
                {t("promotions.pendingApproval.actions.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && (
          <Text className="px-6 pb-4">{t("labels.loading", "Loading...")}</Text>
        )}

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("promotions.pendingApproval.columns.code")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("promotions.pendingApproval.columns.sellerId")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("promotions.pendingApproval.columns.discount")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("promotions.pendingApproval.columns.status")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("promotions.pendingApproval.columns.products", "Ürünler")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("promotions.pendingApproval.columns.actions")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(promotions as PendingPromotion[]).map((promotion) => (
              <Table.Row key={promotion.id}>
                <Table.Cell>
                  <Text className="text-sm font-mono">
                    {stripNamespace(promotion.code ?? "", promotion.seller_id ?? undefined)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">
                    {promotion.seller_name ?? promotion.seller_id ?? "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">{getDiscountLabel(promotion)}</Text>
                  <Text className="text-xs text-ui-fg-subtle">
                    {promotion.type}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color="orange">
                    {promotion.approval_status ?? promotion.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-xs text-ui-fg-subtle">
                    {promotion.application_method?.target_rules
                      ?.flatMap((r) => r.values?.map((v) => v.label ?? v.value) ?? [])
                      .join(", ") || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="small"
                      disabled={isBusy || rejectState?.id === promotion.id}
                      onClick={() => handleApprove(promotion)}
                    >
                      {t("promotions.pendingApproval.actions.approve")}
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      disabled={isBusy || rejectState?.id === promotion.id}
                      onClick={() => handleRejectOpen(promotion)}
                    >
                      {t("promotions.pendingApproval.actions.reject")}
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!isLoading && (promotions as PendingPromotion[]).length === 0 && (
              <Table.Row>
                <Table.Cell
                  {...({ colSpan: 6 } as React.TdHTMLAttributes<HTMLTableCellElement>)}
                  className="py-8 text-center"
                >
                  <Text className="text-center text-ui-fg-subtle py-8">
                    {t("promotions.pendingApproval.noRecords")}
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
          pageCount={pageCount}
          pageIndex={currentPage}
          pageSize={PAGE_SIZE}
        />
      </div>
    </Container>
  )
}
