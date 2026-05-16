import { PencilSquare } from "@medusajs/icons"
import { AdminPromotionRule, ApplicationMethodTargetTypeValues, PromotionRuleTypes } from "@medusajs/types"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { BadgeListSummary } from "../../../../../components/common/badge-list-summary"
import { NoRecords } from "../../../../../components/common/empty-table-content"
import { AdminEnrichedRule, AdminEnrichedRuleValue } from "../../../../../hooks/api/promotions"
import { ExtendedAdminPromotionRule, ExtendedPromotionRuleValue } from "../../../common/edit-rules/types"

/** Renders product values as a thumbnail grid (same style as vendor panel). */
function ProductRuleGrid({ values }: { values: AdminEnrichedRuleValue[] }) {
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

type AttrI18nKey =
  | "promotions.rule.attributeLabels.customer_groups_id"
  | "promotions.rule.attributeLabels.shipping_address_country_code"
  | "promotions.rule.attributeLabels.items_product_id"

const ATTR_I18N_MAP: Record<string, AttrI18nKey> = {
  "customer.groups.id": "promotions.rule.attributeLabels.customer_groups_id",
  "shipping_address.country_code": "promotions.rule.attributeLabels.shipping_address_country_code",
  "items.product.id": "promotions.rule.attributeLabels.items_product_id",
}

type EnrichedRuleBlockProps = { rule: AdminEnrichedRule }
function EnrichedRuleBlock({ rule }: EnrichedRuleBlockProps) {
  const { t } = useTranslation()
  const hasProductThumbnails = (rule.values ?? []).some((v) => v.thumbnail)
  const getValuesList = (): string[] =>
    rule.values?.map((v) => v.label ?? v.value ?? "").filter(Boolean) ?? []

  const attrLabel: string = (() => {
    if (rule.attribute_label) return rule.attribute_label
    const key = ATTR_I18N_MAP[rule.attribute]
    return key ? t(key) : rule.attribute
  })()

  const opLabel: string = (() => {
    if (rule.operator_label) return rule.operator_label
    if (rule.operator === "in") return t("operators.in")
    return rule.operator
  })()

  return (
    <div className="bg-ui-bg-subtle shadow-borders-base rounded-md p-2">
      <div className="text-ui-fg-subtle txt-compact-xsmall flex flex-wrap items-center gap-1">
        <Badge
          size="2xsmall"
          className="txt-compact-xsmall-plus tag-neutral-text mx-1 inline-block truncate"
        >
          {attrLabel}
        </Badge>
        <span className="txt-compact-2xsmall mx-1 inline-block">
          {opLabel}
        </span>
        {!hasProductThumbnails && (
          <BadgeListSummary inline className="!txt-compact-small-plus" list={getValuesList()} />
        )}
      </div>
      {hasProductThumbnails && <ProductRuleGrid values={rule.values ?? []} />}
    </div>
  )
}

type RuleProps = {
  rule: AdminPromotionRule
}

function RuleBlock({ rule }: RuleProps) {
  const extended = rule as ExtendedAdminPromotionRule
  return (
    <div className="bg-ui-bg-subtle shadow-borders-base align-center flex justify-around rounded-md p-2">
      <div className="text-ui-fg-subtle txt-compact-xsmall flex items-center whitespace-nowrap">
        <Badge
          size="2xsmall"
          key="rule-attribute"
          className="txt-compact-xsmall-plus tag-neutral-text mx-1 inline-block truncate"
        >
          {extended.attribute_label ?? rule.attribute}
        </Badge>

        <span className="txt-compact-2xsmall mx-1 inline-block">
          {extended.operator_label ?? rule.operator}
        </span>

        <BadgeListSummary
          inline
          className="!txt-compact-small-plus"
          list={
            extended.field_type === "number"
              ? [rule.values as unknown as string]
              : rule.values?.map((v) => (v as ExtendedPromotionRuleValue).label ?? v.value ?? "")
          }
        />
      </div>
    </div>
  )
}

type PromotionConditionsSectionProps = {
  rules: AdminPromotionRule[]
  ruleType: PromotionRuleTypes
  applicationMethodTargetType?: ApplicationMethodTargetTypeValues
  enrichedRules?: AdminEnrichedRule[]
}

export const PromotionConditionsSection = ({
  rules,
  ruleType,
  applicationMethodTargetType,
  enrichedRules,
}: PromotionConditionsSectionProps) => {
  const { t } = useTranslation()

  // Use enriched rules for display when available, otherwise fall back to raw rules.
  const displayRules = enrichedRules ?? []
  const hasEnriched = enrichedRules !== undefined

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading>
            {t(
              ruleType === "target_rules"
                ? `promotions.fields.conditions.${ruleType}.${applicationMethodTargetType ?? "items"}.title`
                : `promotions.fields.conditions.${ruleType}.title`
            )}
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
        {hasEnriched ? (
          <>
            {displayRules.length === 0 && (
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
            {displayRules.map((rule, i) => (
              <EnrichedRuleBlock key={rule.id ?? i} rule={rule} />
            ))}
          </>
        ) : (
          <>
            {rules.length === 0 && (
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
          </>
        )}
      </div>
    </Container>
  )
}
