import { useLoaderData, useParams } from "react-router-dom"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useDashboardExtension } from "../../../extensions"
import {
  usePromotion,
  usePromotionRuleAttributes,
  usePromotionRules,
} from "../../../hooks/api/promotions"
import { ExtendedPromotionRuleWithValues } from "../../../types/promotion"
import { CampaignSection } from "./components/campaign-section"
import { PromotionConditionsSection } from "./components/promotion-conditions-section"
import { PromotionGeneralSection } from "./components/promotion-general-section"
import { promotionLoader } from "./loader"

/** Enrich raw API rules with human-readable labels from the attribute options. */
function enrichRules(
  rawRules: any[] | undefined,
  attrs: any[] | undefined
): ExtendedPromotionRuleWithValues[] {
  if (!rawRules?.length) return []
  return rawRules.map((rule) => {
    const attrDef = (attrs ?? []).find((a: any) => a.value === rule.attribute)
    return {
      ...rule,
      values: rule.values ?? [],
      attribute_label: attrDef?.label ?? rule.attribute,
      operator_label:
        attrDef?.operators?.find((op: any) => op.value === rule.operator)
          ?.label ?? rule.operator,
    }
  })
}

export const PromotionDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof promotionLoader>
  >

  const { id } = useParams()
  const { promotion, isLoading } = usePromotion(id!, {
    initialData,
  })
  const query: Record<string, string> = {}

  if (promotion?.type === "buyget") {
    query.promotion_type = promotion.type
  }

  const { rules } = usePromotionRules(id!, "rules", query)
  const { rules: targetRules } = usePromotionRules(id!, "target_rules", query)
  const { rules: buyRules } = usePromotionRules(id!, "buy_rules", query)

  // Fetch attribute option definitions to enrich rules with human-readable labels.
  const { attributes: rulesAttrs } = usePromotionRuleAttributes(
    "rules",
    promotion?.type
  )
  const { attributes: targetAttrs } = usePromotionRuleAttributes(
    "target_rules",
    promotion?.type
  )
  const { attributes: buyAttrs } = usePromotionRuleAttributes(
    "buy_rules",
    promotion?.type
  )

  const { getWidgets } = useDashboardExtension()

  if (isLoading || !promotion) {
    return (
      <TwoColumnPageSkeleton mainSections={3} sidebarSections={1} showJSON />
    )
  }

  return (
    <TwoColumnPage
      data={promotion}
      widgets={{
        after: getWidgets("promotion.details.after"),
        before: getWidgets("promotion.details.before"),
        sideAfter: getWidgets("promotion.details.side.after"),
        sideBefore: getWidgets("promotion.details.side.before"),
      }}
      hasOutlet
    >
      <TwoColumnPage.Main>
        <PromotionGeneralSection promotion={promotion} />
        <PromotionConditionsSection
          rules={enrichRules(rules, rulesAttrs)}
          ruleType="rules"
        />
        <PromotionConditionsSection
          rules={enrichRules(targetRules, targetAttrs)}
          ruleType="target_rules"
        />
        {promotion.type === "buyget" && (
          <PromotionConditionsSection
            rules={enrichRules(buyRules, buyAttrs)}
            ruleType="buy_rules"
          />
        )}
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <CampaignSection campaign={promotion.campaign!} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

