import { HttpTypes } from "@medusajs/types"
import { useLoaderData, useParams } from "react-router-dom"
import { useCampaign } from "../../../hooks/api/campaigns"
import { CampaignGeneralSection } from "./components/campaign-general-section"
import { CampaignConfigurationSection } from "./components/campaign-configuration-section"
import { CampaignProductsSection } from "./components/campaign-products-section"
import { campaignLoader } from "./loader"
import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useDashboardExtension } from "../../../extensions"
import { CAMPAIGN_DETAIL_FIELDS } from "./constants"

export const CampaignDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof campaignLoader>
  >
  const { id } = useParams()
  const { campaign, isLoading, isError, error } = useCampaign(
    id!,
    { fields: CAMPAIGN_DETAIL_FIELDS },
    { initialData }
  )
  const { getWidgets } = useDashboardExtension()

  if (isLoading || !campaign) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={1} />
  }
  if (isError) {
    throw error
  }

  return (
    <TwoColumnPage
      widgets={{
        after: getWidgets("campaign.details.after"),
        before: getWidgets("campaign.details.before"),
        sideAfter: getWidgets("campaign.details.side.after"),
        sideBefore: getWidgets("campaign.details.side.before"),
      }}
      hasOutlet
      data={campaign}
    >
      <TwoColumnPage.Main>
        <CampaignGeneralSection campaign={campaign} />
        <CampaignProductsSection campaign={campaign as unknown as HttpTypes.AdminCampaign & { promotions?: HttpTypes.AdminPromotion[] }} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <CampaignConfigurationSection campaign={campaign} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}
