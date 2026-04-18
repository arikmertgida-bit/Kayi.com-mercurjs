import { Heading, Input, Select, Text, Textarea } from "@medusajs/ui"
import { useEffect, useRef } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../components/common/form"
import { FileUpload } from "../../../../../components/common/file-upload"
import { HandleInput } from "../../../../../components/inputs/handle-input"
import { useDocumentDirection } from "../../../../../hooks/use-document-direction"
import { generateHandle } from "../../../../../lib/generate-handle"
import { CreateCategorySchema } from "./schema"

type CreateCategoryDetailsProps = {
  form: UseFormReturn<CreateCategorySchema>
}

export const CreateCategoryDetails = ({ form }: CreateCategoryDetailsProps) => {
  const { t } = useTranslation()
  const direction = useDocumentDirection()
  const isManualHandle = useRef(false)
  const nameValue = form.watch("name")
  const parentCategoryId = useWatch({
    control: form.control,
    name: "parent_category_id",
  })
  const isRootCategory = !parentCategoryId

  useEffect(() => {
    if (!isManualHandle.current) {
      form.setValue("handle", generateHandle(nameValue || ""), {
        shouldValidate: false,
      })
    }
  }, [nameValue, form])
  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        <div>
          <Heading>{t("categories.create.header")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("categories.create.hint")}
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <Form.Label optional tooltip={t("collections.handleTooltip")}>
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
        </div>
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
                  <Form.Label>{t("categories.fields.status.label")}</Form.Label>
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
                  <Form.Control>
                    <FileUpload
                      label="Görsel yüklemek için tıklayın veya sürükleyin"
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
    </div>
  )
}
