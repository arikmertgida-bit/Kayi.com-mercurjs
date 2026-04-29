import { useCallback, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import {
  FileType,
  FileUpload,
} from "../../../../../components/common/file-upload"
import { Form } from "../../../../../components/common/form"
import { MediaSchema } from "../../../product-create/constants"
import {
  EditProductMediaSchemaType,
  ProductCreateSchemaType,
} from "../../../product-create/types"
import { EditStoreSchema } from "../../../../store/store-edit/components/edit-store-form/edit-store-form"

type Media = z.infer<typeof MediaSchema>

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

const SUPPORTED_FORMATS_FILE_EXTENSIONS = [
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".svg",
]

const MAX_IMAGE_COUNT = 12

function ImageLimitModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ui-bg-overlay"
        onClick={onClose}
      />
      <div className="relative z-10 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-elevation-modal w-full max-w-sm mx-4 p-6 flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-1">
          <h2 className="text-ui-fg-base text-base font-semibold inter-base-semibold">
            Görsel Limiti Aşıldı
          </h2>
          <p className="text-ui-fg-subtle text-sm inter-base-regular">
            Bir ürüne en fazla <span className="text-ui-fg-base font-medium">{MAX_IMAGE_COUNT} görsel</span> yükleyebilirsiniz. Lütfen yüklemek istediğiniz görselleri azaltın.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-ui-button-neutral hover:bg-ui-button-neutral-hover active:bg-ui-button-neutral-pressed text-ui-fg-base border border-ui-border-strong rounded-lg px-4 py-2 text-sm font-medium transition-fg"
          >
            Tamam, Anlıyorum
          </button>
        </div>
      </div>
    </div>
  )
}

export const UploadMediaFormItem = ({
  form,
  append,
  showHint = true,
}: {
  form:
    | UseFormReturn<ProductCreateSchemaType>
    | UseFormReturn<EditProductMediaSchemaType>
    | UseFormReturn<z.infer<typeof EditStoreSchema>>
  append: (value: Media) => void
  showHint?: boolean
}) => {
  const { t } = useTranslation()
  const [showLimitModal, setShowLimitModal] = useState(false)

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidFile = fileList.find(
        (f) => !SUPPORTED_FORMATS.includes(f.file.type)
      )

      if (invalidFile) {
        form.setError("media", {
          type: "invalid_file",
          message: t("products.media.invalidFileType", {
            name: invalidFile.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
          }),
        })

        return true
      }

      return false
    },
    [form, t]
  )

  const onUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("media")

      const currentCount = (form.getValues("media") as Media[] | undefined)?.length ?? 0
      if (currentCount + files.length > MAX_IMAGE_COUNT) {
        setShowLimitModal(true)
        return
      }

      if (hasInvalidFiles(files)) {
        return
      }

      files.forEach((f) => append({ ...f, isThumbnail: false }))
    },
    [form, append, hasInvalidFiles]
  )

  return (
    <>
      {showLimitModal && (
        <ImageLimitModal onClose={() => setShowLimitModal(false)} />
      )}
      <Form.Field
        control={
          form.control as UseFormReturn<EditProductMediaSchemaType>["control"]
        }
        name="media"
        render={() => {
          return (
            <Form.Item>
              <div className="flex flex-col gap-y-2">
                <div className="flex flex-col gap-y-1">
                  <Form.Label>{t("products.media.label")}</Form.Label>
                  {showHint && (
                    <Form.Hint>{t("products.media.editHint")}</Form.Hint>
                  )}
                </div>
                <Form.Control>
                  <FileUpload
                    label={t("products.media.uploadImagesLabel")}
                    hint={t("products.media.uploadImagesHint")}
                    hasError={!!form.formState.errors.media}
                    formats={SUPPORTED_FORMATS}
                    onUploaded={onUploaded}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </div>
            </Form.Item>
          )
        }}
      />
    </>
  )
}