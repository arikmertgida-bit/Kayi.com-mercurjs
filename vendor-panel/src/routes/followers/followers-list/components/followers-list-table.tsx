import { Container, Heading, Text } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useFollowers } from "../../../../hooks/api/followers"

const PAGE_SIZE = 20

export const FollowersListTable = () => {
  const [page, setPage] = useState(0)
  const { t, i18n } = useTranslation()

  const { followers, count, isLoading, isError, error } = useFollowers(
    { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
    { placeholderData: keepPreviousData }
  )

  if (isError) {
    throw error
  }

  const totalPages = Math.ceil(count / PAGE_SIZE) || 1

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("followers.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("followers.subtitle")}
          </Text>
        </div>
        <Text className="text-ui-fg-subtle" size="small">
          {count} {t("followers.domain").toLowerCase()}
        </Text>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-ui-bg-subtle">
              <th className="px-6 py-3 text-left font-medium text-ui-fg-subtle">{t("followers.columns.name")}</th>
              <th className="px-6 py-3 text-left font-medium text-ui-fg-subtle">{t("followers.columns.email")}</th>
              <th className="px-6 py-3 text-right font-medium text-ui-fg-subtle">{t("followers.columns.orderCount")}</th>
              <th className="px-6 py-3 text-right font-medium text-ui-fg-subtle">{t("followers.columns.followDate")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-ui-bg-subtle rounded w-32" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-ui-bg-subtle rounded w-48" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-ui-bg-subtle rounded w-12 ml-auto" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-ui-bg-subtle rounded w-24 ml-auto" /></td>
                </tr>
              ))
            ) : followers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-ui-fg-subtle">
                  {t("followers.list.noRecordsMessage")}
                </td>
              </tr>
            ) : (
              followers.map((follower) => (
                <tr key={follower.customer_id} className="border-b hover:bg-ui-bg-subtle-hover transition-colors">
                  <td className="px-6 py-4 font-medium text-ui-fg-base">
                    {follower.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-ui-fg-subtle">{follower.email}</td>
                  <td className="px-6 py-4 text-right text-ui-fg-base">{follower.order_count}</td>
                  <td className="px-6 py-4 text-right text-ui-fg-subtle">{formatDate(follower.followed_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("followers.pagination.page")} {page + 1} / {totalPages}
          </Text>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-ui-bg-subtle transition-colors"
            >
              {t("followers.pagination.prev")}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-ui-bg-subtle transition-colors"
            >
              {t("followers.pagination.next")}
            </button>
          </div>
        </div>
      )}
    </Container>
  )
}
