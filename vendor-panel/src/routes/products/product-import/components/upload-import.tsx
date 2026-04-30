import { useState } from "react"
import { FileType, FileUpload } from "../../../../components/common/file-upload"
import { Hint } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

const SUPPORTED_FORMATS = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/xml",
  "application/xml",
]
const SUPPORTED_FORMATS_FILE_EXTENSIONS = [".csv", ".xlsx", ".xls", ".xml"]

export const UploadImport = ({
  onUploaded,
}: {
  onUploaded: (file: File) => void
}) => {
  const { t } = useTranslation()
  const [error, setError] = useState<string>()

  const hasInvalidFiles = (fileList: FileType[]) => {
    const allowedExt = SUPPORTED_FORMATS_FILE_EXTENSIONS
    const invalidFile = fileList.find((f) => {
      const ext = "." + f.file.name.split(".").pop()?.toLowerCase()
      return (
        !SUPPORTED_FORMATS.includes(f.file.type) &&
        !allowedExt.includes(ext)
      )
    })

    if (invalidFile) {
      setError(
        t("products.media.invalidFileType", {
          name: invalidFile.file.name,
          types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
        })
      )

      return true
    }

    return false
  }

  return (
    <div className="flex flex-col gap-y-4">
      <FileUpload
        label={t("products.import.uploadLabel")}
        hint={t("products.import.uploadHint")}
        multiple={false}
        hasError={!!error}
        formats={SUPPORTED_FORMATS}
        onUploaded={(files) => {
          setError(undefined)
          if (hasInvalidFiles(files)) {
            return
          }
          onUploaded(files[0].file)
        }}
      />

      {error && (
        <div>
          <Hint variant="error">{error}</Hint>
        </div>
      )}
    </div>
  )
}
