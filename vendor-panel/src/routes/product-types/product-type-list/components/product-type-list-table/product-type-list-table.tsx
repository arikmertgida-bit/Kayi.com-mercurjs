import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { _DataTable } from "../../../../../components/table/data-table"
import { useProductTypes } from "../../../../../hooks/api/product-types"
import { useProductTypeTableColumns } from "../../../../../hooks/table/columns/use-product-type-table-columns"
import { useProductTypeTableFilters } from "../../../../../hooks/table/filters/use-product-type-table-filters"
import { useProductTypeTableQuery } from "../../../../../hooks/table/query/use-product-type-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { ProductTypeRowActions } from "./product-table-row-actions"

const PAGE_SIZE = 20

export const ProductTypeListTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw, q } = useProductTypeTableQuery({
    pageSize: PAGE_SIZE,
  })

  const queryWithLimit = useMemo(
    () => (q ? { ...searchParams, limit: 9999, offset: 0 } : searchParams),
    [searchParams, q]
  )

  const { product_types, count, isLoading, isError, error } = useProductTypes(
    queryWithLimit,
    {
      placeholderData: keepPreviousData,
    }
  )

  const filteredTypes = useMemo(() => {
    if (!q) return product_types ?? []
    const lower = q.toLowerCase()
    return (product_types ?? []).filter((pt) =>
      pt.value?.toLowerCase().includes(lower)
    )
  }, [product_types, q])

  const filteredCount = q ? filteredTypes.length : count

  const filters = useProductTypeTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    columns,
    data: filteredTypes,
    count: filteredCount,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            {error instanceof Error ? error.message : "An error occurred while loading product types."}
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("productTypes.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("productTypes.subtitle")}
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="create">Request Product Type</Link>
        </Button>
      </div>
      <_DataTable
        table={table}
        filters={filters}
        isLoading={isLoading}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={filteredCount}
        orderBy={[
          { key: "value", label: t("fields.value") },
          {
            key: "created_at",
            label: t("fields.createdAt"),
          },
          {
            key: "updated_at",
            label: t("fields.updatedAt"),
          },
        ]}
        navigateTo={({ original }) => original.id}
        queryObject={raw}
        pagination
        search
      />
    </Container>
  )
}

const columnHelper = createColumnHelper<HttpTypes.AdminProductType>()

const useColumns = () => {
  const base = useProductTypeTableColumns()

  return useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <ProductTypeRowActions productType={row.original} />
        },
      }),
    ],
    [base]
  )
}
