import { PencilSquare } from "@medusajs/icons"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { BadgeListSummary } from "../../../../../components/common/badge-list-summary"
import { NoRecords } from "../../../../../components/common/empty-table-content"
import { ExtendedPromotionRuleWithValues, ExtendedPromotionRuleValue, FormattedPromotionRuleTypes } from "../../../../../types/promotion"

/** Renders product values as a thumbnail grid instead of text badges. */
function ProductRuleGrid({ values }: { values: ExtendedPromotionRuleValue[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {values.map((v, i) => (
        <div
          key={v.id ?? v.value ?? i}
          className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-base px-2 py-1"
        >
          {v.thumbnail ? (
            <img
              src={v.thumbnail}
              alt={v.label ?? v.value ?? ""}
              className="h-8 w-8 rounded-sm object-cover object-center flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-sm bg-ui-bg-subtle flex-shrink-0" />
          )}
          <span className="txt-compact-small truncate max-w-[120px]">
            {v.label ?? v.value}
          </span>
        </div>
      ))}
    </div>
  )
}

type RuleProps = {
  rule: ExtendedPromotionRuleWithValues
}
function RuleBlock({ rule }: RuleProps) {
  const hasProductThumbnails = (rule.values ?? []).some((v) => v.thumbnail)

  const getValuesList = (): string[] => {
    if (rule.field_type === "number") {
      return Array.isArray(rule.values) 
        ? rule.values.map((v) => String(v.value || v))
        : [String(rule.values)]
    }
    return rule.values?.map((v) => v.label || v.value || String(v)).filter(Boolean) || []
  }

  return (
    <div className="bg-ui-bg-subtle shadow-borders-base rounded-md p-2">
      <div className="text-ui-fg-subtle txt-compact-xsmall flex flex-wrap items-center gap-1">
        <Badge
          size="2xsmall"
          key="rule-attribute"
          className="txt-compact-xsmall-plus tag-neutral-text mx-1 inline-block truncate"
        >
          {rule.attribute_label}
        </Badge>

        <span className="txt-compact-2xsmall mx-1 inline-block">
          {rule.operator_label}
        </span>

        {!hasProductThumbnails && (
          <BadgeListSummary
            inline
            className="!txt-compact-small-plus"
            list={getValuesList()}
          />
        )}
      </div>

      {hasProductThumbnails && (
        <ProductRuleGrid values={rule.values ?? []} />
      )}
    </div>
  )
}

type PromotionConditionsSectionProps = {
  rules: ExtendedPromotionRuleWithValues[]
  ruleType: FormattedPromotionRuleTypes
}

export const PromotionConditionsSection = ({
  rules,
  ruleType,
}: PromotionConditionsSectionProps) => {
  const { t } = useTranslation()
  const translationKey = `promotions.fields.conditions.${ruleType}.title` as const
  
  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading>
            {t(translationKey)}
          </Heading>
        </div>

        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: t("actions.edit"),
                  to: `${ruleType}/edit`,
                },
              ],
            },
          ]}
        />
      </div>

      <div className="text-ui-fg-subtle flex flex-col gap-2 px-6 pb-4 pt-2">
        {!rules.length && (
          <NoRecords
            className="h-[180px]"
            title={t("general.noRecordsTitle")}
            message={t("promotions.conditions.list.noRecordsMessage")}
            action={{
              to: `${ruleType}/edit`,
              label: t("promotions.conditions.add"),
            }}
            buttonVariant="transparentIconLeft"
          />
        )}

        {rules.map((rule) => (
          <RuleBlock key={`${rule.id}-${rule.attribute}`} rule={rule} />
        ))}
      </div>
    </Container>
  )
}
