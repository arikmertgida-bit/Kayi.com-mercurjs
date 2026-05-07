import { useTranslation } from "react-i18next"
import { PlaceholderCell } from "../../common/placeholder-cell"

type CustomerCellProps = {
  customer?: string | null
}

export const CustomerCell = ({ customer }: CustomerCellProps) => {
  if (!customer) {
    return <PlaceholderCell />
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">{customer}</span>
    </div>
  )
}

export const CustomerHeader = () => {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("reviews.detail.customer.header")}</span>
    </div>
  )
}
