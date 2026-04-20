import { Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { keepPreviousData } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { _DataTable } from "../../../../../components/table/data-table"
import { useCollections } from "../../../../../hooks/api/collections"
import { useCollectionTableColumns } from "../../../../../hooks/table/columns/use-collection-table-columns"
import { useCollectionTableFilters } from "../../../../../hooks/table/filters"
import { useCollectionTableQuery } from "../../../../../hooks/table/query"
import { useDataTable } from "../../../../../hooks/use-data-table"

const PAGE_SIZE = 20

export const CollectionListTable = () => {
  const { t } = useTranslation()
  const [localSearch, setLocalSearch] = useState("")

  const { searchParams, raw } = useCollectionTableQuery({
    pageSize: PAGE_SIZE,
  })

  // Collections backend endpoint only supports: fields, offset, limit, order, q
  // Date filters (created_at, updated_at) are not accepted → strip them
  const { created_at, updated_at, q: _q, ...collectionApiParams } = searchParams as any

  const { product_collections, count: totalCount, isError, error, isLoading } =
    useCollections(
      {
        ...collectionApiParams,
        limit: 1000,
        fields: "*products",
      },
      {
        placeholderData: keepPreviousData,
      }
    )

  const filteredCollections = useMemo(() => {
    const all = product_collections ?? []
    if (localSearch.length < 2) return all
    const lower = localSearch.toLowerCase()
    return all.filter(
      (c) =>
        c.title?.toLowerCase().includes(lower) ||
        c.handle?.toLowerCase().includes(lower)
    )
  }, [product_collections, localSearch])

  const filters = useCollectionTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    data: filteredCollections,
    columns,
    count: filteredCollections.length,
    enablePagination: true,
    getRowId: (row, index) => row.id ?? `${index}`,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  const searchQueryObject = localSearch.length >= 2 ? { q: localSearch } : {}

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("collections.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("collections.subtitle")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Input
            autoComplete="off"
            name="q"
            type="search"
            size="small"
            placeholder={t("general.search")}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <Link to="/collections/create">
            <Button size="small" variant="secondary">
              Request Collection
            </Button>
          </Link>
        </div>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={filteredCollections.length}
        filters={filters}
        orderBy={[
          { key: "title", label: t("fields.title") },
          { key: "handle", label: t("fields.handle") },
          {
            key: "created_at",
            label: t("fields.createdAt"),
          },
          {
            key: "updated_at",
            label: t("fields.updatedAt"),
          },
        ]}
        navigateTo={(row) => `/collections/${row.original.id}`}
        queryObject={searchQueryObject}
        isLoading={isLoading}
      />
    </Container>
  )
}

const useColumns = () => {
  const base = useCollectionTableColumns()

  return useMemo(() => [...base], [base])
}
