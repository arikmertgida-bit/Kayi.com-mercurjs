import { useTranslation } from "react-i18next"
import { StatusCell as StatusCell_ } from "../../common/status-cell"

type StatusCellProps = {
  status: string | null
}

export const StatusCell = ({ status }: StatusCellProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">
        <StatusCell_ color={!status ? "orange" : "green"}>
          {!status ? t("reviews.statuses.waitingForReply") : t("reviews.statuses.replied")}
        </StatusCell_>
      </span>
    </div>
  )
}

export const StatusHeader = () => {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("reviews.columns.status")}</span>
    </div>
  )
}
