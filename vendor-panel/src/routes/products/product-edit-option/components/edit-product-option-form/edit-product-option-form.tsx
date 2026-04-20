import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Text } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../components/common/form"
import { ChipInput } from "../../../../../components/inputs/chip-input"
import {
  FileUpload,
  FileType,
} from "../../../../../components/common/file-upload/file-upload"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  useUpdateProductOption,
  useUpdateProduct,
} from "../../../../../hooks/api/products"
import { uploadFilesQuery } from "../../../../../lib/client"
import { ExtendedAdminProduct } from "../../../../../types/products"

type EditProductOptionFormProps = {
  option: HttpTypes.AdminProductOption
  product: ExtendedAdminProduct
}

const CreateProductOptionSchema = z.object({
  title: z.string().min(1),
  values: z.array(z.string()).optional(),
})

export const CreateProductOptionForm = ({
  option,
  product,
}: EditProductOptionFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const isColorOption = option.title.toLowerCase() === "color"

  // Local state for swatch file selections keyed by option value name
  const existingSwatches =
    (product.metadata?.color_swatches as Record<string, string> | undefined) ||
    {}
  const [swatchFiles, setSwatchFiles] = useState<
    Record<string, FileType | null>
  >({})

  const form = useForm<z.infer<typeof CreateProductOptionSchema>>({
    defaultValues: {
      title: option.title,
      values: option?.values?.map((v) => v.value),
    },
    resolver: zodResolver(CreateProductOptionSchema),
  })

  const { mutateAsync, isPending } = useUpdateProductOption(
    option.product_id!,
    option.id
  )

  const { mutateAsync: updateProduct, isPending: isUpdatingProduct } =
    useUpdateProduct(product.id)

  const handleSubmit = form.handleSubmit(async (values) => {
    // Save option title/values
    await mutateAsync(values, {
      onError: (err) => {
        // handled below via toast after combined save
        throw err
      },
    })

    // If color option, upload any new swatch images and save to product metadata
    if (isColorOption) {
      const updatedSwatches: Record<string, string> = { ...existingSwatches }

      for (const [valueName, fileType] of Object.entries(swatchFiles)) {
        if (fileType?.file) {
          const uploaded = await uploadFilesQuery([{ file: fileType.file }])
          const url = uploaded?.files?.[0]?.url
          if (url) {
            updatedSwatches[valueName] = url
          }
        }
      }

      await updateProduct({
        metadata: {
          ...((product.metadata as Record<string, unknown>) || {}),
          color_swatches: updatedSwatches,
        },
      })
    }

    handleSuccess()
  })

  const currentValues = form.watch("values") || []

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto">
          <Form.Field
            control={form.control}
            name="title"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>
                    {t("products.fields.options.optionTitle")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      placeholder={t(
                        "products.fields.options.optionTitlePlaceholder"
                      )}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="values"
            render={({ field: { ...field } }) => {
              return (
                <Form.Item>
                  <Form.Label>
                    {t("products.fields.options.variations")}
                  </Form.Label>
                  <Form.Control>
                    <ChipInput
                      {...field}
                      placeholder={t(
                        "products.fields.options.variantionsPlaceholder"
                      )}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />

          {isColorOption && currentValues.length > 0 && (
            <div className="flex flex-col gap-y-3 pt-2 border-t">
              <Text size="small" weight="plus">
                {t("products.options.colorSwatches", "Renk Görselleri")}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t(
                  "products.options.colorSwatchesHint",
                  "Her renk değeri için bir görsel veya ikon yükleyin."
                )}
              </Text>
              <div className="flex flex-col gap-y-4">
                {currentValues.map((valueName) => (
                  <div key={valueName} className="flex flex-col gap-y-1">
                    <Text size="xsmall" weight="plus">
                      {valueName}
                    </Text>
                    <FileUpload
                      label={t(
                        "products.options.uploadSwatch",
                        "Görsel Seç"
                      )}
                      multiple={false}
                      formats={[
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/gif",
                        "image/svg+xml",
                      ]}
                      uploadedImage={
                        swatchFiles[valueName]?.url ||
                        existingSwatches[valueName] ||
                        ""
                      }
                      onUploaded={(files: FileType[]) => {
                        if (files[0]) {
                          setSwatchFiles((prev) => ({
                            ...prev,
                            [valueName]: files[0],
                          }))
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button
              type="submit"
              size="small"
              isLoading={isPending || isUpdatingProduct}
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
