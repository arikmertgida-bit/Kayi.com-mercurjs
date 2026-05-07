import { useTranslation } from "react-i18next"
import { PlaceholderCell } from "../../common/placeholder-cell"
import { StarsRating } from "../../../../common/stars-rating/stars-rating"

type StarsCellProps = {
  rating?: number
}

export const StarsCell = ({ rating }: StarsCellProps) => {
  if (!rating) {
    return <PlaceholderCell />
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <StarsRating rate={rating} />
    </div>
  )
}

export const StarsHeader = () => {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("reviews.detail.general.stars")}</span>
    </div>
  )
}
