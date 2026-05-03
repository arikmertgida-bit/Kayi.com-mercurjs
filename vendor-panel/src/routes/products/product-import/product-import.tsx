import { Button, Heading, Text, Badge, Label, Select, Input, toast } from "@medusajs/ui"
import { RouteDrawer, useRouteModal } from "../../../components/modals"
import { useTranslation } from "react-i18next"
import { useEffect, useMemo, useState } from "react"
import ProductFormImport from "./components/product-form-import"
import {
  useImportProducts,
  useConfirmImportProducts,
  useImportJobStatus,
  ImportAnalyzeResult,
} from "../../../hooks/api"
import { queryClient } from "../../../lib/query-client"
import { productsQueryKeys } from "../../../hooks/api/products"
import { useStockLocations } from "../../../hooks/api/stock-locations"
import { UploadImport } from "./components/upload-import"
import { Trash } from "@medusajs/icons"
import { FilePreview } from "../../../components/common/file-preview"
import { getProductImportCsvTemplate } from "./helpers/import-template"
import { CategoryCombobox } from "../common/components/category-combobox/category-combobox"

type Step = "upload" | "analyze" | "mapping" | "progress" | "done"

interface CategoryMapping {
  name: string
  platform_id: string
}

export const ProductImport = () => {
  const { t } = useTranslation()
  const [method, setMethod] = useState<"csv" | "form" | null>(null)

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.import.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("products.import.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>

      {method === null && (
        <>
          <RouteDrawer.Body>
            <div className="flex flex-col gap-y-4">
              <Text size="small" className="text-ui-fg-subtle">
                İçe aktarma yöntemini seçin:
              </Text>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMethod("csv")}
                  className="flex flex-col items-start gap-2 rounded-lg border border-ui-border-base bg-ui-bg-base p-5 text-left hover:bg-ui-bg-base-hover transition-colors cursor-pointer"
                >
                  <Text weight="plus">CSV ile İçe Aktar</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    CSV, Excel veya XML dosyasından toplu ürün yükle
                  </Text>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("form")}
                  className="flex flex-col items-start gap-2 rounded-lg border border-ui-border-base bg-ui-bg-base p-5 text-left hover:bg-ui-bg-base-hover transition-colors cursor-pointer"
                >
                  <Text weight="plus">Form ile Ürün Gir</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    Formu doldurarak tek tek veya toplu ürün oluştur
                  </Text>
                </button>
              </div>
            </div>
          </RouteDrawer.Body>
          <RouteDrawer.Footer>
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
          </RouteDrawer.Footer>
        </>
      )}

      {method === "csv" && (
        <>
          <div className="px-6 pt-4">
            <Button
              variant="transparent"
              size="small"
              onClick={() => setMethod(null)}
              className="text-ui-fg-subtle hover:text-ui-fg-base -ml-2"
            >
              ← Geri
            </Button>
          </div>
          <ProductImportContent />
        </>
      )}

      {method === "form" && (
        <>
          <div className="px-6 pt-4">
            <Button
              variant="transparent"
              size="small"
              onClick={() => setMethod(null)}
              className="text-ui-fg-subtle hover:text-ui-fg-base -ml-2"
            >
              ← Geri
            </Button>
          </div>
          <RouteDrawer.Body>
            <ProductFormImport />
          </RouteDrawer.Body>
        </>
      )}
    </RouteDrawer>
  )
}

const ProductImportContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const [step, setStep] = useState<Step>("upload")
  const [filename, setFilename] = useState<string>()
  const [analyzeResult, setAnalyzeResult] = useState<ImportAnalyzeResult | null>(null)
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([])
  const [jobId, setJobId] = useState<string>()
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [stockLocationId, setStockLocationId] = useState<string>("")
  const [totalStock, setTotalStock] = useState<string>("")

  const { stock_locations = [] } = useStockLocations({ limit: 9999 })

  const { mutateAsync: analyzeFile, isPending: isAnalyzing } = useImportProducts()
  const { mutateAsync: confirmImport, isPending: isConfirming } = useConfirmImportProducts()
  const { data: jobData } = useImportJobStatus(jobId, {
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? 2000 : undefined,
  })

  const job = jobData?.job

  // Stop polling when done or failed
  useEffect(() => {
    if (job?.status === "done" || job?.status === "failed") {
      setPollingEnabled(false)
      setStep("done")
      if (job?.status === "done") {
        queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      }
    }
  }, [job?.status])

  const productImportTemplateContent = useMemo(() => getProductImportCsvTemplate(), [])

  const handleUploaded = async (file: File) => {
    setFilename(file.name)
    setStep("analyze")
    try {
      const result = await analyzeFile({ file })
      setAnalyzeResult(result)
      if (result.categories_to_map?.length > 0) {
        setCategoryMappings(
          result.categories_to_map.map((name) => ({ name, platform_id: "" }))
        )
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to analyze file")
      setFilename(undefined)
      setStep("upload")
    }
  }

  const handleConfirm = async () => {
    if (!analyzeResult) return

    const missingMappings = categoryMappings.filter((m) => !m.platform_id)
    if (missingMappings.length > 0) {
      toast.error(t("products.import.mapping.incomplete", "All categories must be mapped before importing"))
      return
    }

    try {
      const res = await confirmImport({
        transaction_id: analyzeResult.transaction_id,
        category_mapping: categoryMappings.filter((m) => m.platform_id),
        stock_location_id: stockLocationId || undefined,
        total_stock: totalStock !== "" ? Number(totalStock) : undefined,
      })
      setJobId(res.job_id)
      setPollingEnabled(true)
      setStep("progress")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start import")
    }
  }

  const handleCategoryMappingChange = (name: string, platform_id: string) => {
    setCategoryMappings((prev) =>
      prev.map((m) => (m.name === name ? { ...m, platform_id } : m))
    )
  }

  const uploadedFileActions = [
    {
      actions: [
        {
          label: t("actions.delete"),
          icon: <Trash />,
          onClick: () => {
            setFilename(undefined)
            setAnalyzeResult(null)
            setCategoryMappings([])
            setStockLocationId("")
            setTotalStock("")
            setStep("upload")
          },
        },
      ],
    },
  ]

  const progressPercent = job && job.total > 0
    ? Math.round((job.processed / job.total) * 100)
    : 0

  return (
    <>
      <RouteDrawer.Body>
        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-y-4">
            <Heading level="h2">{t("products.import.upload.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("products.import.upload.description")}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              Desteklenen formatlar: <strong>CSV, Excel (.xlsx), XML</strong>
            </Text>
            <UploadImport onUploaded={handleUploaded} />
            <Heading className="mt-4" level="h2">
              {t("products.import.template.title")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("products.import.template.description")}
            </Text>
            <FilePreview
              filename={"product-import-template.csv"}
              url={productImportTemplateContent}
            />
          </div>
        )}

        {/* ── Step: Analyzing ── */}
        {step === "analyze" && filename && (
          <div className="flex flex-col gap-y-4">
            <FilePreview
              filename={filename}
              loading={isAnalyzing}
              activity={t("products.import.upload.preprocessing")}
              actions={!isAnalyzing ? uploadedFileActions : undefined}
            />

            {analyzeResult && (
              <div className="flex flex-col gap-y-3 mt-2">
                <Heading level="h2">Analiz Sonucu</Heading>
                <div className="flex gap-x-4 flex-wrap">
                  <div className="flex flex-col">
                    <Text size="xsmall" className="text-ui-fg-subtle">Toplam Ürün</Text>
                    <Text weight="plus">{analyzeResult.total}</Text>
                  </div>
                  <div className="flex flex-col">
                    <Text size="xsmall" className="text-ui-fg-subtle">Yeni Eklenecek</Text>
                    <Text weight="plus" className="text-ui-fg-interactive">{analyzeResult.to_create}</Text>
                  </div>
                  <div className="flex flex-col">
                    <Text size="xsmall" className="text-ui-fg-subtle">Güncellenecek</Text>
                    <Text weight="plus">{analyzeResult.to_update}</Text>
                  </div>
                </div>

                {(analyzeResult.sku_conflicts?.length ?? 0) > 0 && (
                  <div className="rounded-md bg-ui-bg-subtle p-3 border border-ui-border-caution">
                    <Text size="small" weight="plus" className="text-ui-fg-caution">
                      ⚠ {analyzeResult.sku_conflicts.length} adet SKU çakışması tespit edildi
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                      Bu SKU'lar başka satıcılara ait. İçe aktarma sırasında otomatik olarak yeniden adlandırılacak.
                    </Text>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {analyzeResult.sku_conflicts.slice(0, 5).map((c) => (
                        <Badge key={c.sku} color="orange" size="xsmall">{c.sku}</Badge>
                      ))}
                      {analyzeResult.sku_conflicts.length > 5 && (
                        <Badge color="orange" size="xsmall">+{analyzeResult.sku_conflicts.length - 5} daha</Badge>
                      )}
                    </div>
                  </div>
                )}

                {(analyzeResult.errors?.length ?? 0) > 0 && (
                  <div className="rounded-md bg-ui-bg-subtle p-3 border border-ui-border-error">
                    <Text size="small" weight="plus" className="text-ui-fg-error">
                      {analyzeResult.errors.length} satırda hata var
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                      Bu satırlar atlanacak. Devam etmek isterseniz aşağıdaki butona tıklayın.
                    </Text>
                  </div>
                )}

                {/* Stock location & total stock */}
                <div className="flex flex-col gap-y-3 mt-2">
                  <Heading level="h3">Stok Ayarları</Heading>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="import-location">Stok Lokasyonu</Label>
                    <Select value={stockLocationId} onValueChange={setStockLocationId}>
                      <Select.Trigger id="import-location">
                        <Select.Value placeholder="Lokasyon seçin (opsiyonel)" />
                      </Select.Trigger>
                      <Select.Content>
                        {stock_locations.map((loc) => (
                          <Select.Item key={loc.id} value={loc.id}>
                            {loc.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      Seçilen lokasyonda stok seviyesi oluşturulur. Boş bırakılırsa CSV'deki stok miktarı kullanılır.
                    </Text>
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="import-total-stock">Toplam Stok (opsiyonel)</Label>
                    <Input
                      id="import-total-stock"
                      type="number"
                      min={0}
                      placeholder="Tüm ürünler için geçerli olacak stok miktarı"
                      value={totalStock}
                      onChange={(e) => setTotalStock(e.target.value)}
                    />
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      Girilirse CSV'deki stok sütununu geçersiz kılar ve tüm ürünler bu miktarla güncellenir.
                    </Text>
                  </div>
                </div>

                {/* Category mapping */}
                {(analyzeResult.categories_to_map?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-y-3 mt-2">
                    <Heading level="h3">Kategori Eşleştirme</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Dosyadaki kategorileri platform kategorileriyle eşleştirin:
                    </Text>
                    {categoryMappings.map((mapping) => (
                      <div key={mapping.name} className="flex items-center gap-x-3">
                        <Label className="min-w-[140px] shrink-0">{mapping.name}</Label>
                        <CategoryCombobox
                          value={mapping.platform_id ? [mapping.platform_id] : []}
                          onChange={(ids) =>
                            handleCategoryMappingChange(mapping.name, ids[0] ?? "")
                          }
                          placeholder="Kategori seçin..."
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Progress ── */}
        {step === "progress" && job && (
          <div className="flex flex-col gap-y-4">
            {job.status === "queued" ? (
              <>
                <Heading level="h2">Sıraya Alındı</Heading>
                <div className="rounded-md bg-ui-bg-subtle border border-ui-border-base p-4 flex flex-col gap-y-2">
                  {job.queue_position && job.queue_position > 1 ? (
                    <>
                      <Text size="base" weight="plus">
                        İşleminiz {job.queue_position}. sırada, lütfen bekleyin...
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Toplamda {job.total} ürün grubu içe aktarılacak.
                        Önünüzde {job.queue_position - 1} iş var.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text size="base" weight="plus">
                        İşleminiz başlamak üzere...
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Toplamda {job.total} ürün grubu içe aktarılacak.
                      </Text>
                    </>
                  )}
                </div>
                <div className="w-full bg-ui-bg-subtle rounded-full h-2.5 overflow-hidden">
                  <div className="bg-ui-fg-interactive h-2.5 rounded-full animate-pulse w-[5%]" />
                </div>
              </>
            ) : (
              <>
                <Heading level="h2">İçe Aktarılıyor...</Heading>
                <div className="w-full bg-ui-bg-subtle rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-ui-fg-interactive h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  {job.processed} / {job.total} işlendi ({progressPercent}%)
                </Text>
                <div className="flex gap-x-4">
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Eklendi: <strong>{job.created}</strong>
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Güncellendi: <strong>{job.updated}</strong>
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Atlandı: <strong>{job.skipped}</strong>
                  </Text>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && job && (
          <div className="flex flex-col gap-y-4">
            <Heading level="h2">
              {job.status === "done" ? "İçe Aktarma Tamamlandı ✓" : "İçe Aktarma Başarısız"}
            </Heading>
            <div className="flex gap-x-4 flex-wrap">
              <div className="flex flex-col">
                <Text size="xsmall" className="text-ui-fg-subtle">Eklendi</Text>
                <Text weight="plus" className="text-ui-fg-interactive">{job.created}</Text>
              </div>
              <div className="flex flex-col">
                <Text size="xsmall" className="text-ui-fg-subtle">Güncellendi</Text>
                <Text weight="plus">{job.updated}</Text>
              </div>
              <div className="flex flex-col">
                <Text size="xsmall" className="text-ui-fg-subtle">Atlandı/Hata</Text>
                <Text weight="plus" className={job.skipped > 0 ? "text-ui-fg-error" : ""}>{job.skipped}</Text>
              </div>
            </div>

            {job.sku_changes.length > 0 && (
              <div className="rounded-md bg-ui-bg-subtle p-3 border border-ui-border-base">
                <Text size="small" weight="plus">SKU Yeniden Adlandırmalar ({job.sku_changes.length})</Text>
                <div className="mt-1 flex flex-col gap-y-1 max-h-32 overflow-y-auto">
                  {job.sku_changes.map((c) => (
                    <Text key={c.original} size="xsmall" className="text-ui-fg-subtle">
                      {c.original} → {c.generated}
                    </Text>
                  ))}
                </div>
              </div>
            )}

            {(job as any).error_log_url && (
              <a
                href={(job as any).error_log_url}
                download
                className="text-ui-fg-interactive text-sm underline"
              >
                Hata logunu indir (CSV)
              </a>
            )}
          </div>
        )}
      </RouteDrawer.Body>

      <RouteDrawer.Footer>
        <div className="flex items-center gap-x-2">
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteDrawer.Close>

          {step === "analyze" && analyzeResult && !isAnalyzing && (
            <Button
              size="small"
              onClick={handleConfirm}
              isLoading={isConfirming}
              disabled={isConfirming}
            >
              İçe Aktarmayı Başlat
            </Button>
          )}

          {step === "done" && (
            <Button size="small" onClick={() => handleSuccess()}>
              {t("actions.close")}
            </Button>
          )}
        </div>
      </RouteDrawer.Footer>
    </>
  )
}

