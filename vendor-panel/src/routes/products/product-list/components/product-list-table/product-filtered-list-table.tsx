import { Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
  Checkbox,
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import {
  createColumnHelper,
  OnChangeFn,
  RowSelectionState,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ExtendedAdminProduct } from "../../../../../types/products"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { _DataTable } from "../../../../../components/table/data-table"
import {
  useDeleteProduct,
  useBulkDeleteProducts,
  useProducts,
} from "../../../../../hooks/api/products"
import { useProductTableColumns } from "../../../../../hooks/table/columns/use-product-table-columns"
import { useProductTableFilters } from "../../../../../hooks/table/filters/use-product-table-filters"
import { useProductTableQuery } from "../../../../../hooks/table/query/use-product-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"

const PAGE_SIZE = 10

type ProductFilteredListTableProps = {
  productType: "single" | "variant"
  heading: string
  createTo: string
  createLabel: string
}

export const ProductFilteredListTable = ({
  productType,
  heading,
  createTo,
  createLabel,
}: ProductFilteredListTableProps) => {
  const { t } = useTranslation()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const updater: OnChangeFn<RowSelectionState> = (newSelection) => {
    const update =
      typeof newSelection === "function"
        ? newSelection(rowSelection)
        : newSelection
    setRowSelection(update)
  }

  const { searchParams, raw } = useProductTableQuery({ pageSize: PAGE_SIZE })

  // metadata alanını API'den getir, client-side filtreleme için şart
  const queryParams = {
    ...searchParams,
    fields: "id,title,handle,status,*collection,*categories,*sales_channels,variants.id,thumbnail,metadata",
  }

  const { products: allProducts, isLoading, isError, error } = useProducts(
    queryParams as any,
    { placeholderData: keepPreviousData }
  )

  // Client-side metadata filtresi (API desteklemiyorsa fallback)
  const products = useMemo(() => {
    if (!allProducts) return []
    return allProducts.filter(
      (p: ExtendedAdminProduct) =>
        (p as any).metadata?.product_type === productType
    )
  }, [allProducts, productType])

  const count = products.length

  const filters = useProductTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    data: products,
    columns,
    count,
    enablePagination: true,
    enableRowSelection: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row?.id || "",
    rowSelection: { state: rowSelection, updater },
  })

  const { mutateAsync } = useBulkDeleteProducts()
  const prompt = usePrompt()

  const handleDelete = async () => {
    const keys = Object.keys(rowSelection)
    if (keys.length === 0) return

    const res = await prompt({
      title: t("products.bulkDelete.title"),
      description: t("products.bulkDelete.description", { count: keys.length }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) return

    await mutateAsync(keys, {
      onSuccess: () => {
        setRowSelection({})
        toast.success(
          t("products.bulkDelete.success", { count: keys.length })
        )
      },
      onError: (error) => {
        toast.error(t("products.bulkDelete.error"), {
          description: error.message,
        })
      },
    })
  }

  if (isError) throw error

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{heading}</Heading>
        <div className="flex items-center justify-center gap-x-2">
          <Button size="small" variant="primary" asChild>
            <Link to={createTo}>{createLabel}</Link>
          </Button>
        </div>
      </div>
      {!isLoading && count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-y-4 py-16">
          <Text size="small" className="text-ui-fg-subtle">
            {heading} bulunamadı.
          </Text>
          <Button size="small" variant="secondary" asChild>
            <Link to={createTo}>{createLabel}</Link>
          </Button>
        </div>
      ) : (
        <_DataTable
          table={table}
          columns={columns}
          count={count}
          pageSize={PAGE_SIZE}
          filters={filters}
          search
          pagination
          isLoading={isLoading}
          queryObject={raw}
          navigateTo={(row) => `/products/${row.original.id}`}
          orderBy={[
            { key: "title", label: t("fields.title") },
            { key: "created_at", label: t("fields.createdAt") },
            { key: "updated_at", label: t("fields.updatedAt") },
          ]}
          commands={[
            {
              action: handleDelete,
              label: t("actions.delete"),
              shortcut: "d",
            },
          ]}
          noRecords={{
            title: t("products.list.noRecordsTitle"),
            message: t("products.list.noRecordsMessage"),
            action: { to: createTo, label: createLabel },
          }}
        />
      )}
    </Container>
  )
}

const ProductActions = ({ product }: { product: ExtendedAdminProduct }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { mutateAsync } = useDeleteProduct(product.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("products.deleteWarning", { title: product.title }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) return

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(t("products.toasts.delete.success.header"), {
          description: t("products.toasts.delete.success.description", {
            title: product.title,
          }),
        })
      },
      onError: (e) => {
        toast.error(t("products.toasts.delete.error.header"), {
          description: e.message,
        })
      },
    })
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  )
}

const columnHelper = createColumnHelper<ExtendedAdminProduct>()

const useColumns = () => {
  const { t } = useTranslation()
  const base = useProductTableColumns()

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <ProductActions product={row.original} />,
      }),
    ],
    [base, t]
  )

  return columns
}
