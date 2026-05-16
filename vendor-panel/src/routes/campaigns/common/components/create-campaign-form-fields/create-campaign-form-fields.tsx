import { Checkbox, DatePicker, Heading, Input, toast } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import {
  OnChangeFn,
  RowSelectionState,
} from "@tanstack/react-table"
import { useEffect, useMemo, useRef, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Form } from "../../../../../components/common/form"
import { _DataTable } from "../../../../../components/table/data-table"
import { useProducts } from "../../../../../hooks/api/products"
import { usePromotions } from "../../../../../hooks/api/promotions"
import { useProductTableColumns } from "../../../../../hooks/table/columns/use-product-table-columns"
import { useProductTableQuery } from "../../../../../hooks/table/query/use-product-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"
import { ExtendedAdminProduct } from "../../../../../types/products"
import { CreateCampaignFormValues } from "../../../campaign-create/components/create-campaign-form/create-campaign-form"

const PAGE_SIZE = 20

const columnHelper = createColumnHelper<ExtendedAdminProduct>()

const useColumns = (conflictSelectedIds: ReadonlySet<string>) => {
  const base = useProductTableColumns()
  return useMemo(
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
        id: "conflict_warning",
        header: () => null,
        cell: ({ row }) =>
          conflictSelectedIds.has(row.id) ? (
            <span className="text-ui-fg-error text-xs">
              Bu ürün zaten bir promosyon kodunda kullanılıyor
            </span>
          ) : null,
      }),
    ],
    [base, conflictSelectedIds]
  )
}

type Props = {
  form: UseFormReturn<CreateCampaignFormValues>
  onConflict?: (ids: string[]) => void
}

export const CreateCampaignFormFields = ({ form, onConflict }: Props) => {
  const selectedIds: string[] = form.watch("product_ids")

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    () =>
      selectedIds.reduce<RowSelectionState>((acc, id) => {
        acc[id] = true
        return acc
      }, {})
  )

  const { searchParams, raw } = useProductTableQuery({ pageSize: PAGE_SIZE })

  // Satıcıya ait manuel promosyon kodlarını çek (is_automatic: false)
  const { promotions: allPromotions } = usePromotions({ limit: 100 })

  // Ürün üzerinde aktif promosyon kodu olan ürünleri map olarak tut: productId → promo code
  const promotionConflictMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const promo of allPromotions ?? []) {
      if (promo.is_automatic !== false) continue
      for (const rule of promo.application_method?.target_rules ?? []) {
        if (rule.attribute === "items.product.id") {
          for (const val of rule.values ?? []) {
            if (val.value) map.set(val.value, promo.code ?? promo.id)
          }
        }
      }
    }
    return map
  }, [allPromotions])

  // Seçim değiştiğinde 500ms debounce ile güncellenen seçili ürün listesi
  const [debouncedSelectedIds, setDebouncedSelectedIds] = useState<string[]>(selectedIds)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSelectedIds(selectedIds)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectedIds])

  // Seçili ve aynı zamanda promosyon koduyla çakışan ürünler
  const conflictSelectedIds = useMemo(
    () => new Set(debouncedSelectedIds.filter((id) => promotionConflictMap.has(id))),
    [debouncedSelectedIds, promotionConflictMap]
  )

  // Mevcut sayfadaki ürün adı haritası (toast mesajı için)
  const { products, count, isPending: isLoading } = useProducts(searchParams)
  const productTitleMap = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.title ?? p.id])),
    [products]
  )

  // Önceki conflict setini takip et — toast sadece yeni çakışmalarda gösterilir
  const prevConflictRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newConflicts = [...conflictSelectedIds].filter((id) => !prevConflictRef.current.has(id))
    if (newConflicts.length > 0) {
      const firstId = newConflicts[0]
      const productName = productTitleMap.get(firstId) ?? firstId
      toast.error(`${productName} promosyon kodu içermektedir, kampanyaya eklenemez.`)
    }
    prevConflictRef.current = conflictSelectedIds
    onConflict?.([...conflictSelectedIds])
  }, [conflictSelectedIds, productTitleMap, onConflict])

  const columns = useColumns(conflictSelectedIds)

  const updater: OnChangeFn<RowSelectionState> = (next) => {
    const value = typeof next === "function" ? next(rowSelection) : next
    setRowSelection(value)
    form.setValue("product_ids", Object.keys(value), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const { table } = useDataTable({
    data: products ?? [],
    columns,
    count,
    pageSize: PAGE_SIZE,
    enablePagination: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    rowSelection: {
      state: rowSelection,
      updater,
    },
  })

  return (
    <div className="flex flex-col gap-y-8">
      <Form.Field
        control={form.control}
        name="name"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>Kampanya Adı</Form.Label>
            <Form.Control>
              <Input {...field} placeholder="Yaz İndirimi" autoComplete="off" />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <Form.Field
          control={form.control}
          name="starts_at"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>Başlangıç Tarihi</Form.Label>
              <Form.Control>
                <DatePicker
                  granularity="day"
                  shouldCloseOnSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="ends_at"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>Bitiş Tarihi</Form.Label>
              <Form.Control>
                <DatePicker
                  granularity="day"
                  shouldCloseOnSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>

      <Form.Field
        control={form.control}
        name="discount_value"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>İndirim Oranı (%)</Form.Label>
            <Form.Control>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="20"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </Form.Control>
            <Form.Hint>Seçilen tüm ürünlere bu oran uygulanır.</Form.Hint>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <div className="flex flex-col gap-y-3">
        <Heading level="h3">Kampanyaya Dahil Ürünler</Heading>
        {form.formState.errors.product_ids?.message && (
          <p className="text-ui-fg-error text-small-regular">
            {form.formState.errors.product_ids.message}
          </p>
        )}
        <_DataTable
          table={table}
          columns={columns}
          count={count ?? 0}
          pageSize={PAGE_SIZE}
          pagination
          search
          isLoading={isLoading}
          queryObject={raw}
        />
      </div>
    </div>
  )
}