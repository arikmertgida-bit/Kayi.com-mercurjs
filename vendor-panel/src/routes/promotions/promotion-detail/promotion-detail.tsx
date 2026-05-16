import { useLoaderData, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { SingleColumnPage } from "../../../components/layout/pages"
import { useDashboardExtension } from "../../../extensions"
import {
  usePromotion,
  usePromotionRuleAttributes,
  usePromotionRules,
} from "../../../hooks/api/promotions"
import { ExtendedPromotionRuleWithValues } from "../../../types/promotion"
import { PromotionConditionsSection } from "./components/promotion-conditions-section"
import { PromotionGeneralSection } from "./components/promotion-general-section"
import { promotionLoader } from "./loader"

/** Enrich raw API rules with human-readable labels from the attribute options. */
function enrichRules(
  rawRules: any[] | undefined,
  attrs: any[] | undefined,
  t: (key: string, options?: Record<string, string>) => string
): ExtendedPromotionRuleWithValues[] {
  if (!rawRules?.length) return []
  return rawRules.map((rule) => {
    const attrDef = (attrs ?? []).find((a: any) => a.value === rule.attribute)
    const apiOperatorLabel =
      attrDef?.operators?.find((op: any) => op.value === rule.operator)?.label ?? rule.operator
    return {
      ...rule,
      values: rule.values ?? [],
      attribute_label: t(`promotions.form.ruleAttribute.${attrDef?.id}`, { defaultValue: attrDef?.label ?? rule.attribute }),
      operator_label: t(`promotions.form.ruleOperator.${rule.operator}`, { defaultValue: apiOperatorLabel }),
    }
  })
}

export const PromotionDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof promotionLoader>
  >
  const { t } = useTranslation()
  const tStr = t as unknown as (key: string, options?: Record<string, string>) => string

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
      <TwoColumnPageSkeleton mainSections={3} sidebarSections={0} showJSON />
    )
  }

  return (
    <SingleColumnPage
      data={promotion}
      widgets={{
        after: getWidgets("promotion.details.after"),
        before: getWidgets("promotion.details.before"),
      }}
      hasOutlet
    >
      <PromotionGeneralSection promotion={promotion} />
      <PromotionConditionsSection
        rules={enrichRules(rules, rulesAttrs, tStr)}
        ruleType="rules"
      />
      <PromotionConditionsSection
        rules={enrichRules(targetRules, targetAttrs, tStr)}
        ruleType="target_rules"
      />
      {promotion.type === "buyget" && (
        <PromotionConditionsSection
          rules={enrichRules(buyRules, buyAttrs, tStr)}
          ruleType="buy_rules"
        />
      )}
    </SingleColumnPage>
  )
}

