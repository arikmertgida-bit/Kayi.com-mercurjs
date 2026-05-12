import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { RouteDrawer } from "../../../components/modals"
import { useCampaigns } from "../../../hooks/api/campaigns"
import { usePromotion } from "../../../hooks/api/promotions"
import { AddCampaignPromotionForm } from "./components/add-campaign-promotion-form"

export const PromotionAddCampaign = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const { promotion, isPending, isError, error } = usePromotion(id!)

  let campaignQuery = {}

  // budget[currency_code] query param causes 400 on the vendor endpoint.
  // Fetch all campaigns and filter client-side instead.
  const currencyCode = promotion?.application_method?.currency_code

  const {
    campaigns: allCampaigns,
    isPending: areCampaignsLoading,
    isError: isCampaignError,
    error: campaignError,
  } = useCampaigns(campaignQuery)

  const campaigns = currencyCode
    ? (allCampaigns ?? []).filter(
        (c) =>
          !c.budget?.currency_code ||
          c.budget.currency_code === currencyCode
      )
    : (allCampaigns ?? [])
  if (isError || isCampaignError) {
    throw error || campaignError
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("promotions.campaign.edit.header")}</Heading>
      </RouteDrawer.Header>

      {!isPending && !areCampaignsLoading && promotion && campaigns && (
        <AddCampaignPromotionForm promotion={promotion} campaigns={campaigns} />
      )}
    </RouteDrawer>
  )
}
