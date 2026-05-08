import { StatusCell as StatusCell_ } from "../../../components/table/table-cells/common/status-cell"
import { useTranslation } from "react-i18next"

type StatusCellProps = {
  status: "pending" | "connected" | "not connected"
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "orange"
    case "connected":
      return "green"
    case "not connected":
      return "red"
    default:
      return "grey"
  }
}

export const Status = ({ status }: StatusCellProps) => {
  const { t } = useTranslation()

  const label =
    status === "connected"
      ? t("stripeConnect.status.connected")
      : status === "not connected"
        ? t("stripeConnect.status.notConnected")
        : t("stripeConnect.status.pending")

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">
        <StatusCell_ color={getStatusColor(status)}>{label}</StatusCell_>
      </span>
    </div>
  )
}
