import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Form } from "../../../../components/common/form"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Select, Textarea, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useCreateVendorRequest, useUpdateRequest } from "../../../../hooks/api"

const reasonList = [
  "notTrue",
  "insulting",
  "offensive",
  "other",
]

const ReviewReplySchema = z.object({
  reason: z.string().min(1),
  comment: z.string().optional(),
})

export const ReviewReportForm = ({ request }: { request?: any }) => {
  const { handleSuccess } = useRouteModal()
  const { id } = useParams()

  const isEditing = !!request

  const reviewReason = request?.data?.reason.split(" comment: ")[0] || ""
  const reviewComment = request?.data?.reason.split(" comment: ")[1] || ""

  const defaultValues = isEditing
    ? {
        reason: reviewReason,
        comment: reviewComment,
      }
    : {
        reason: "",
        comment: "",
      }

  const form = useForm<z.infer<typeof ReviewReplySchema>>({
    defaultValues,
    resolver: zodResolver(ReviewReplySchema),
  })

  const { mutateAsync: createRequest, isPending } = useCreateVendorRequest()
  const { mutateAsync: updateRequest, isPending: isUpdating } =
    useUpdateRequest(id!)
  const { t } = useTranslation()

  const handleSubmit = form.handleSubmit(async (data) => {
    const reason = `${data.reason}${data.comment ? ` comment: ${data.comment}` : ""}`

    if (isEditing) {
      await updateRequest(
        {
          request: {
            type: "review_remove",
            data: {
              review_id: request.data.review_id,
              reason,
            },
          },
        },
        {
          onSuccess: () => {
            toast.success(t("reviews.report.updateRequest"), {
              description: t("reviews.report.waitForResponse"),
            })
            handleSuccess(`/requests/reviews`)
          },
        }
      )
    } else {
      await createRequest(
        {
          request: {
            type: "review_remove",
            data: {
              review_id: id,
              reason,
            },
          },
        },
        {
          onSuccess: () => {
            toast.success(t("reviews.report.reported"), {
              description: t("reviews.report.waitForResponse"),
            })
            handleSuccess(`/reviews/${id}`)
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }
  })

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{isEditing ? t("reviews.report.editHeader") : t("reviews.report.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description>
          {isEditing
            ? t("reviews.report.editDescription")
            : t("reviews.report.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Form form={form}>
        <RouteDrawer.Body>
          <Form.Field
            control={form.control}
            name="reason"
            render={({ field: { ref, onChange, ...field } }) => {
              return (
                <Form.Item className="mt-4">
                  <Form.Label>{t("reviews.report.reason")}</Form.Label>
                  <Form.Control>
                    <Select {...field} onValueChange={onChange}>
                      <Select.Trigger ref={ref}>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {reasonList.map((reason, index) => (
                          <Select.Item
                            key={`select-option-${index}`}
                            value={reason}
                          >
                            {t(`reviews.report.reasons.${reason}` as any)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="comment"
            render={({ field }) => {
              return (
                <Form.Item className="mt-8">
                  <Form.Label>{t("reviews.report.comment")}</Form.Label>
                  <Form.Control>
                    <Textarea autoComplete="off" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </RouteDrawer.Body>
      </RouteDrawer.Form>
      <RouteDrawer.Footer>
        <Button
          onClick={handleSubmit}
          className="px-6"
          isLoading={isPending || isUpdating}
        >
          {isEditing ? t("reviews.report.updateRequest") : t("reviews.report.submit")}
        </Button>
      </RouteDrawer.Footer>
    </RouteDrawer>
  )
}
