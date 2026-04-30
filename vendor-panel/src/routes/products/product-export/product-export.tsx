import { Button, Heading, RadioGroup, Label, toast } from "@medusajs/ui"
import { RouteDrawer, useRouteModal } from "../../../components/modals"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useExportProducts } from "../../../hooks/api"

export const ProductExport = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.export.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("products.export.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <ProductExportContent />
    </RouteDrawer>
  )
}

const ProductExportContent = () => {
  const { t } = useTranslation()
  const [format, setFormat] = useState<"csv" | "xlsx">("csv")
  const { mutateAsync, isPending } = useExportProducts()
  const { handleSuccess } = useRouteModal()

  const handleExportRequest = async () => {
    await mutateAsync(
      { format },
      {
        onSuccess: () => {
          toast.success(t("products.export.success.title"))
          handleSuccess()
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )
  }

  return (
    <>
      <RouteDrawer.Body>
        <div className="flex flex-col gap-y-4">
          <div>
            <Label weight="plus">{t("products.export.format", "Format")}</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "xlsx")}
              className="mt-2 flex gap-x-4"
            >
              <div className="flex items-center gap-x-2">
                <RadioGroup.Item value="csv" id="export-csv" />
                <Label htmlFor="export-csv">CSV</Label>
              </div>
              <div className="flex items-center gap-x-2">
                <RadioGroup.Item value="xlsx" id="export-xlsx" />
                <Label htmlFor="export-xlsx">Excel (.xlsx)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <div className="flex items-center gap-x-2">
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteDrawer.Close>
          <Button onClick={handleExportRequest} size="small" isLoading={isPending}>
            {t("actions.export")}
          </Button>
        </div>
      </RouteDrawer.Footer>
    </>
  )
}

