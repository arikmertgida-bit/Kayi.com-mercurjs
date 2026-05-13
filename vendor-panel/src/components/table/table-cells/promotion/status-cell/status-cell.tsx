import { HttpTypes } from "@medusajs/types"
import { getPromotionStatus } from "../../../../../lib/promotions"
import { StatusCell as StatusCell_ } from "../../common/status-cell"

/** HttpTypes.AdminPromotion lacks a metadata field — extend for runtime support. */
type PromotionWithMeta = HttpTypes.AdminPromotion & {
  metadata?: Record<string, unknown> | null
}

type PromotionCellProps = {
  promotion: HttpTypes.AdminPromotion
}

export const StatusCell = ({ promotion }: PromotionCellProps) => {
  const [color, text] = getPromotionStatus(promotion as PromotionWithMeta)

  return <StatusCell_ color={color}>{text}</StatusCell_>
}
