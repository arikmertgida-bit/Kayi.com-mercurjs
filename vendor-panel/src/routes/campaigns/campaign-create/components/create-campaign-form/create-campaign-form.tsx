import { zodResolver } from "@hookform/resolvers/zod"
import { Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { VisuallyHidden } from "../../../../../components/utilities/visually-hidden"
import { useCreateCampaign } from "../../../../../hooks/api/campaigns"
import { CreateCampaignFormFields } from "../../../common/components/create-campaign-form-fields"

export const CreateCampaignSchema = zod.object({
  name: zod.string().min(1, "Kampanya adı zorunludur."),
  starts_at: zod.date({ required_error: "Başlangıç tarihi zorunludur." }),
  ends_at: zod.date({ required_error: "Bitiş tarihi zorunludur." }),
  discount_value: zod
    .number({ invalid_type_error: "İndirim oranı sayı olmalıdır." })
    .min(1, "Minimum %1 giriniz.")
    .max(100, "Maksimum %100 giriniz."),
  product_ids: zod
    .array(zod.string())
    .min(1, "En az bir ürün seçmelisiniz."),
})

export type CreateCampaignFormValues = zod.infer<typeof CreateCampaignSchema>

export const CreateCampaignForm = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { mutateAsync, isPending } = useCreateCampaign()
  const [conflictingProductIds, setConflictingProductIds] = useState<string[]>([])

  const form = useForm<CreateCampaignFormValues>({
    defaultValues: {
      name: "",
      starts_at: undefined,
      ends_at: undefined,
      discount_value: undefined,
      product_ids: [],
    },
    resolver: zodResolver(CreateCampaignSchema),
  })

  // Satıcı ürün seçimini değiştirdiğinde (ekleme/çıkarma) çakışma listesini anında güncelle.
  // Bu, 500ms debounce'lu child effect'e ek, doğrudan parent-level temizleme katmanıdır.
  // F5 bug'ının önüne geçer: deselect edilmiş ürünler button'u anında re-enable eder.
  const productIds = form.watch("product_ids")
  useEffect(() => {
    setConflictingProductIds((prev) => prev.filter((id) => productIds.includes(id)))
  }, [productIds])

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(
      {
        name: data.name,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        discount_value: data.discount_value,
        product_ids: data.product_ids,
      },
      {
        onSuccess: ({ campaign }) => {
          toast.success(
            t("campaigns.create.successToast", { name: campaign.name })
          )
          handleSuccess(`/campaigns/${campaign.id}`)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex size-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header>
          <RouteFocusModal.Title asChild>
            <VisuallyHidden>{t("campaigns.create.title")}</VisuallyHidden>
          </RouteFocusModal.Title>
          <RouteFocusModal.Description asChild>
            <VisuallyHidden>{t("campaigns.create.description")}</VisuallyHidden>
          </RouteFocusModal.Description>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex size-full flex-col items-center overflow-auto py-16">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            <CreateCampaignFormFields form={form} onConflict={setConflictingProductIds} />
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              size="small"
              variant="primary"
              type="submit"
              isLoading={isPending}
              disabled={conflictingProductIds.length > 0}
            >
              {t("actions.create")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
