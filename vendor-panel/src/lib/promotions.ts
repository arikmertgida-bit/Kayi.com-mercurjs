import { HttpTypes } from "@medusajs/types"
import { i18n } from "../components/utilities/i18n"

export enum PromotionStatus {
  SCHEDULED = "SCHEDULED",
  EXPIRED = "EXPIRED",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  REJECTED = "REJECTED",
}

export type StatusColors = "grey" | "orange" | "green" | "red" | "grey"
export type StatusMap = Record<string, [StatusColors, string]>
export const promotionStatusMap: StatusMap = {
  [PromotionStatus.ACTIVE]: ["green", i18n.t("statuses.active")],
  [PromotionStatus.INACTIVE]: ["red", i18n.t("statuses.inactive")],
  [PromotionStatus.DRAFT]: ["grey", i18n.t("statuses.draft")],
  [PromotionStatus.SCHEDULED]: [
    "orange",
    `${i18n.t("promotions.fields.campaign")} ${i18n.t("statuses.scheduled").toLowerCase()}`,
  ],
  [PromotionStatus.EXPIRED]: [
    "red",
    `${i18n.t("promotions.fields.campaign")} ${i18n.t("statuses.expired").toLowerCase()}`,
  ],
  [PromotionStatus.PENDING_APPROVAL]: ["orange", i18n.t("statuses.pendingApproval")],
  [PromotionStatus.REJECTED]: ["red", i18n.t("statuses.rejected")],
}

export const getPromotionStatus = (promotion: HttpTypes.AdminPromotion) => {
  const date = new Date()
  const campaign = promotion.campaign

  // Vendor panelinde status field'ı onay durumunu doğrudan kodlar:
  //   inactive = admin onayı bekleniyor
  //   draft    = admin tarafından reddedildi
  //   active   = onaylandı (kampanya zamanlamasına göre ek kontroller yapılır)
  if (promotion.status === "inactive") {
    return promotionStatusMap[PromotionStatus.PENDING_APPROVAL]
  }

  if (promotion.status === "draft") {
    return promotionStatusMap[PromotionStatus.REJECTED]
  }

  // status === "active" — kampanya zamanlaması / bütçe kontrolü
  if (!campaign) {
    return promotionStatusMap[PromotionStatus.ACTIVE]
  }

  if (campaign.starts_at && new Date(campaign.starts_at!) > date) {
    return promotionStatusMap[PromotionStatus.SCHEDULED]
  }

  const campaignBudget = campaign.budget
  const overBudget =
    campaignBudget && campaignBudget.used! > campaignBudget.limit!

  if ((campaign.ends_at && new Date(campaign.ends_at) < date) || overBudget) {
    return promotionStatusMap[PromotionStatus.EXPIRED]
  }

  return promotionStatusMap[PromotionStatus.ACTIVE]
}
