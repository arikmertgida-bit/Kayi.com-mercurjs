import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Select, Textarea, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { HttpTypes } from "@medusajs/types"
import { Form } from "../../../../../components/common/form"
import { FileUpload } from "../../../../../components/common/file-upload"
import { HandleInput } from "../../../../../components/inputs/handle-input"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateProductCategory } from "../../../../../hooks/api/categories"
import { useDocumentDirection } from "../../../../../hooks/use-document-direction"
import { generateHandle } from "../../../../../lib/generate-handle"
import { sdk } from "../../../../../lib/client"

const EditCategorySchema = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  visibility: z.enum(["public", "internal"]),
  thumbnail: z.instanceof(File).optional(),
})

type EditCategoryFormProps = {
  category: HttpTypes.AdminProductCategory
}

export const EditCategoryForm = ({ category }: EditCategoryFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const direction = useDocumentDirection()
  const [isPendingUpload, setIsPendingUpload] = useState(false)
  const isRootCategory = !category.parent_category_id
  const existingThumbnail = category.metadata?.thumbnail as string | undefined
  const form = useForm<z.infer<typeof EditCategorySchema>>({
    defaultValues: {
      name: category.name,
      handle: category.handle,
      description: category.description || "",
      status: category.is_active ? "active" : "inactive",
      visibility: category.is_internal ? "internal" : "public",
    },
    resolver: zodResolver(EditCategorySchema),
  })

  const isManualHandle = useRef(!!category.handle)
  const nameValue = form.watch("name")

  useEffect(() => {
    if (!isManualHandle.current) {
      form.setValue("handle", generateHandle(nameValue || ""), {
        shouldValidate: false,
      })
    }
  }, [nameValue, form])

  const { mutateAsync, isPending } = useUpdateProductCategory(category.id)
  const handleSubmit = form.handleSubmit(async (data) => {
    let thumbnailUrl: string | undefined = existingThumbnail

    if (isRootCategory && data.thumbnail) {
      setIsPendingUpload(true)
      try {
        const { files: uploaded } = await sdk.admin.upload.create({ files: [data.thumbnail] })
        thumbnailUrl = uploaded[0]?.url
      } catch {
        toast.error("Görsel yüklenemedi")
        setIsPendingUpload(false)
        return
      }
      setIsPendingUpload(false)
    }

    await mutateAsync(
      {
        name: data.name,
        description: data.description,
        handle: data.handle,
        is_active: data.status === "active",
        is_internal: data.visibility === "internal",
        ...(isRootCategory ? { metadata: { thumbnail: thumbnailUrl ?? null } } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t("categories.edit.successToast"))
          handleSuccess()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.title")}</Form.Label>
                    <Form.Control>
                      <Input autoComplete="off" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="handle"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label
                      optional
                      tooltip={t("collections.handleTooltip")}
                    >
                      {t("fields.handle")}
                    </Form.Label>
                    <Form.Control>
                      <HandleInput
                        {...field}
                        onChange={(e) => {
                          isManualHandle.current = true
                          field.onChange(e)
                        }}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="description"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.description")}</Form.Label>
                    <Form.Control>
                      <Textarea {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="status"
                render={({ field: { ref, onChange, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>
                        {t("categories.fields.status.label")}
                      </Form.Label>
                      <Form.Control>
                        <Select
                          dir={direction}
                          {...field}
                          onValueChange={onChange}
                        >
                          <Select.Trigger ref={ref}>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="active">
                              {t("categories.fields.status.active")}
                            </Select.Item>
                            <Select.Item value="inactive">
                              {t("categories.fields.status.inactive")}
                            </Select.Item>
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
                name="visibility"
                render={({ field: { ref, onChange, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>
                        {t("categories.fields.visibility.label")}
                      </Form.Label>
                      <Form.Control>
                        <Select
                          dir={direction}
                          {...field}
                          onValueChange={onChange}
                        >
                          <Select.Trigger ref={ref}>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="public">
                              {t("categories.fields.visibility.public")}
                            </Select.Item>
                            <Select.Item value="internal">
                              {t("categories.fields.visibility.internal")}
                            </Select.Item>
                          </Select.Content>
                        </Select>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
            </div>
            {isRootCategory && (
              <Form.Field
                control={form.control}
                name="thumbnail"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>Görsel (Thumbnail)</Form.Label>
                      {existingThumbnail && !field.value && (
                        <img
                          src={existingThumbnail}
                          alt="Mevcut görsel"
                          className="mb-2 h-20 w-20 rounded-md object-cover"
                        />
                      )}
                      <Form.Control>
                        <FileUpload
                          label="Yeni görsel yüklemek için tıklayın veya sürükleyin"
                          hint="JPEG, PNG, WebP, GIF desteklenir"
                          multiple={false}
                          formats={[
                            "image/jpeg",
                            "image/png",
                            "image/webp",
                            "image/gif",
                          ]}
                          onUploaded={(files) => {
                            field.onChange(files[0]?.file ?? undefined)
                          }}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
            )}
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending || isPendingUpload}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
