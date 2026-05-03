import { memo, useState, useMemo } from "react"
import {
  Button,
  Heading,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { Plus } from "@medusajs/icons"
import {
  useBulkImportProducts,
  useImportJobStatus,
  productsQueryKeys,
  type BulkProductEntry,
} from "../../../../hooks/api/products"
import { useStockLocations } from "../../../../hooks/api/stock-locations"
import { useProductCategories } from "../../../../hooks/api/categories"
import { useProductTags } from "../../../../hooks/api/tags"
import { useProductTypes } from "../../../../hooks/api/product-types"
import { useCollections } from "../../../../hooks/api/collections"
import { queryClient } from "../../../../lib/query-client"
import ProductEntryRow from "./product-entry-row"

const EMPTY_ENTRY = (): BulkProductEntry => ({
  title: "",
  status: "proposed",
  product_type: "simple",
  price: 0,
  stock: 0,
})

const ProductFormImport = () => {
  const [entries, setEntries] = useState<BulkProductEntry[]>([EMPTY_ENTRY()])
  const [globalLocationId, setGlobalLocationId] = useState<string>("")
  const [jobId, setJobId] = useState<string | undefined>()
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorIndices, setErrorIndices] = useState<Set<number>>(new Set())

  const { data: locData } = useStockLocations()
  const { data: catData } = useProductCategories()
  const { data: tagData } = useProductTags()
  const { data: typeData } = useProductTypes()
  const { data: colData } = useCollections()

  const stockLocations: { id: string; name: string }[] = useMemo(
    () =>
      (locData?.stock_locations ?? []).map((sl: any) => ({
        id: sl.id,
        name: sl.name,
      })),
    [locData]
  )
  const categories: { id: string; name: string }[] = useMemo(
    () =>
      (catData?.product_categories ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
      })),
    [catData]
  )
  const tags: { id: string; value: string }[] = useMemo(
    () =>
      (tagData?.product_tags ?? []).map((t: any) => ({
        id: t.id,
        value: t.value,
      })),
    [tagData]
  )
  const types: { id: string; value: string }[] = useMemo(
    () =>
      (typeData?.product_types ?? []).map((t: any) => ({
        id: t.id,
        value: t.value,
      })),
    [typeData]
  )
  const collections: { id: string; title: string }[] = useMemo(
    () =>
      (colData?.product_collections ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
      })),
    [colData]
  )

  const { mutate: bulkImport, isPending } = useBulkImportProducts({
    onSuccess: (data) => {
      setJobId(data.job_id)
      setPollingEnabled(true)
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Kuyruk başlatılamadı")
    },
  })

  const { data: jobData } = useImportJobStatus(jobId, {
    enabled: pollingEnabled,
    refetchInterval: 2000,
  })
  const job = jobData?.job

  if (job?.status === "done" || job?.status === "failed") {
    if (pollingEnabled) {
      setPollingEnabled(false)
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
    }
  }

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        ...EMPTY_ENTRY(),
        stock_location_id: globalLocationId || undefined,
      },
    ])
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
    setErrorIndices((prev) => {
      const next = new Set<number>()
      prev.forEach((i) => {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      })
      return next
    })
  }

  const handleChange = (index: number, updated: BulkProductEntry) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? updated : e)))
    if (updated.title) {
      setErrorIndices((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  const handleGlobalLocation = (locationId: string) => {
    setGlobalLocationId(locationId)
    setEntries((prev) =>
      prev.map((e) => ({ ...e, stock_location_id: locationId || undefined }))
    )
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const badIndices = new Set<number>()
    entries.forEach((e, i) => {
      if (!e.title.trim()) badIndices.add(i)
    })
    if (badIndices.size > 0) {
      setErrorIndices(badIndices)
      toast.error("Tüm ürünlerin adı zorunludur.")
      return
    }
    setErrorIndices(new Set())
    bulkImport({ products: entries })
  }

  const isQueued = job?.status === "queued"
  const isRunning = isQueued || job?.status === "pending" || job?.status === "running"
  const isDone = job?.status === "done" || job?.status === "failed"

  const progress =
    job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Heading level="h2">Toplu Ürün Girişi</Heading>
        <Button
          variant="secondary"
          size="small"
          type="button"
          onClick={addEntry}
          disabled={isRunning || isDone}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Yeni Ürün Ekle
        </Button>
      </div>

      {/* Global stock location */}
      <div className="space-y-1 max-w-xs">
        <Label size="small">Varsayılan Stok Lokasyonu (tüm ürünler için)</Label>
        <Select
          value={globalLocationId}
          onValueChange={handleGlobalLocation}
        >
          <Select.Trigger>
            <Select.Value placeholder="Seçin" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">— Yok —</Select.Item>
            {stockLocations.map((sl) => (
              <Select.Item key={sl.id} value={sl.id}>
                {sl.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      {/* Entry rows */}
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <ProductEntryRow
            key={index}
            index={index}
            entry={entry}
            hasError={submitted && errorIndices.has(index)}
            stockLocations={stockLocations}
            categories={categories}
            tags={tags}
            types={types}
            collections={collections}
            onChange={handleChange}
            onRemove={removeEntry}
          />
        ))}
      </div>

      {/* Queue info */}
      <Text size="small" className="text-ui-fg-subtle">
        Kuyrukta {entries.length} ürün var
      </Text>

      {/* Progress */}
      {jobId && (
        <div className="space-y-2">
          {isQueued ? (
            <div className="rounded-md bg-ui-bg-subtle border border-ui-border-base p-3">
              {job?.queue_position && job.queue_position > 1 ? (
                <Text size="small" weight="plus">
                  İşleminiz {job.queue_position}. sırada, lütfen bekleyin...
                </Text>
              ) : (
                <Text size="small" weight="plus">
                  İşleminiz başlamak üzere...
                </Text>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm text-ui-fg-subtle">
                <span>
                  {isRunning
                    ? `${job?.processed ?? 0}/${job?.total ?? entries.length} işlendi`
                    : isDone
                    ? "Tamamlandı"
                    : "Hazırlanıyor..."}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-ui-bg-switch-off rounded-full overflow-hidden">
                <div
                  className="h-full bg-ui-bg-interactive rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Done summary */}
      {isDone && job && (
        <div className="rounded-lg border border-ui-border-base p-4 space-y-1 bg-ui-bg-subtle">
          <Text weight="plus">
            {job.status === "done" ? "✓ Tamamlandı" : "⚠ Tamamlandı (hatalarla)"}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {job.created} ürün oluşturuldu
            {job.skipped > 0 ? `, ${job.skipped} başarısız` : ""}
          </Text>
          {job.errors?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {job.errors.slice(0, 5).map((e: any, i: number) => (
                <li key={i} className="text-xs text-ui-fg-error">
                  Satır {e.row}: {e.message}
                </li>
              ))}
              {job.errors.length > 5 && (
                <li className="text-xs text-ui-fg-subtle">
                  … ve {job.errors.length - 5} hata daha
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Submit */}
      {!isDone && (
        <Button
          variant="primary"
          type="button"
          onClick={handleSubmit}
          isLoading={isPending || isRunning}
          disabled={entries.length === 0 || isRunning}
          className="w-full"
        >
          {isRunning
            ? "İşleniyor..."
            : `Tümünü Kuyruğa Al ve Yayınla (${entries.length})`}
        </Button>
      )}
    </div>
  )
}

export default memo(ProductFormImport)
