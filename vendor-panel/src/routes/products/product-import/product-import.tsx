import { Button, Heading, Text, Badge, Input, Label, toast } from "@medusajs/ui"
import { RouteDrawer, useRouteModal } from "../../../components/modals"
import { useTranslation } from "react-i18next"
import { useEffect, useMemo, useState } from "react"
import {
  useImportProducts,
  useConfirmImportProducts,
  useImportJobStatus,
  ImportAnalyzeResult,
} from "../../../hooks/api"
import { UploadImport } from "./components/upload-import"
import { Trash } from "@medusajs/icons"
import { FilePreview } from "../../../components/common/file-preview"
import { getProductImportCsvTemplate } from "./helpers/import-template"

type Step = "upload" | "analyze" | "mapping" | "progress" | "done"

interface CategoryMapping {
  name: string
  platform_id: string
}

export const ProductImport = () => {
  const { t } = useTranslation()

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
      <ProductImportContent />
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

                {analyzeResult.sku_conflicts.length > 0 && (
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

                {analyzeResult.errors.length > 0 && (
                  <div className="rounded-md bg-ui-bg-subtle p-3 border border-ui-border-error">
                    <Text size="small" weight="plus" className="text-ui-fg-error">
                      {analyzeResult.errors.length} satırda hata var
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                      Bu satırlar atlanacak. Devam etmek isterseniz aşağıdaki butona tıklayın.
                    </Text>
                  </div>
                )}

                {/* Category mapping */}
                {analyzeResult.categories_to_map.length > 0 && (
                  <div className="flex flex-col gap-y-3 mt-2">
                    <Heading level="h3">Kategori Eşleştirme</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Dosyadaki kategorileri platform kategorileriyle eşleştirin (Platform Kategori ID girin):
                    </Text>
                    {categoryMappings.map((mapping) => (
                      <div key={mapping.name} className="flex items-center gap-x-3">
                        <Label className="min-w-[140px] shrink-0">{mapping.name}</Label>
                        <Input
                          placeholder="Kategori ID"
                          value={mapping.platform_id}
                          onChange={(e) =>
                            handleCategoryMappingChange(mapping.name, e.target.value)
                          }
                          size="small"
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

