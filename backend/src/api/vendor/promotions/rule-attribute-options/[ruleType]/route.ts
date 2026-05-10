import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ApplicationMethodType, PromotionType, RuleOperator } from "@medusajs/framework/utils"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"

const operatorsMap = {
  [RuleOperator.IN]: { label: "In", value: RuleOperator.IN },
  [RuleOperator.EQ]: { label: "Equals", value: RuleOperator.EQ },
  [RuleOperator.NE]: { label: "Not Equals", value: RuleOperator.NE },
  [RuleOperator.GT]: { label: "Greater Than", value: RuleOperator.GT },
  [RuleOperator.GTE]: { label: "Greater Than or Equal", value: RuleOperator.GTE },
  [RuleOperator.LT]: { label: "Less Than", value: RuleOperator.LT },
  [RuleOperator.LTE]: { label: "Less Than or Equal", value: RuleOperator.LTE },
  [RuleOperator.NIN]: { label: "Not In", value: RuleOperator.NIN },
}

const allOperators = Object.values(operatorsMap)

const ruleAttributes = [
  {
    id: "customer_group",
    value: "customer.groups.id",
    label: "Customer Group",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "region",
    value: "region.id",
    label: "Region",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "country",
    value: "shipping_address.country_code",
    label: "Country",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "sales_channel",
    value: "sales_channel_id",
    label: "Sales Channel",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
]

const itemsAttributes = [
  {
    id: "product",
    value: "items.product.id",
    label: "Product",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "product_category",
    value: "items.product.categories.id",
    label: "Product Category",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "product_collection",
    value: "items.product.collection_id",
    label: "Product Collection",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "product_type",
    value: "items.product.type_id",
    label: "Product Type",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
  {
    id: "product_tag",
    value: "items.product.tags.id",
    label: "Product Tag",
    required: false,
    field_type: "multiselect",
    operators: allOperators,
  },
]

const currencyRule = {
  id: "currency_code",
  value: "currency_code",
  label: "Currency Code",
  field_type: "select",
  required: true,
  disguised: true,
  hydrate: true,
  operators: [operatorsMap[RuleOperator.EQ]],
}

const buyGetBuyRules = [
  {
    id: "buy_rules_min_quantity",
    value: "buy_rules_min_quantity",
    label: "Minimum quantity of items",
    field_type: "number",
    required: true,
    disguised: true,
    operators: [operatorsMap[RuleOperator.EQ]],
  },
]

const buyGetTargetRules = [
  {
    id: "apply_to_quantity",
    value: "apply_to_quantity",
    label: "Quantity of items promotion will apply to",
    field_type: "number",
    required: true,
    disguised: true,
    operators: [operatorsMap[RuleOperator.EQ]],
  },
]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  await fetchSellerByAuthActorId(actorId, req.scope)

  const { ruleType } = req.params
  const promotionType = req.query.promotion_type as string | undefined
  const applicationMethodType = req.query.application_method_type as string | undefined

  const map: Record<string, unknown[]> = {
    rules: [...ruleAttributes],
    "target-rules": [...itemsAttributes],
    "buy-rules": [...itemsAttributes],
    // vendor uses underscores in the URL
    target_rules: [...itemsAttributes],
    buy_rules: [...itemsAttributes],
  }

  if (applicationMethodType === ApplicationMethodType.FIXED) {
    const rulesArr = map["rules"] as unknown[]
    rulesArr.push({ ...currencyRule })
    const targetArr = map["target-rules"] as unknown[]
    targetArr.push({ ...currencyRule })
    const targetArrUs = map["target_rules"] as unknown[]
    targetArrUs.push({ ...currencyRule })
  } else {
    const rulesArr = map["rules"] as unknown[]
    rulesArr.push({ ...currencyRule, required: false })
    const targetArr = map["target-rules"] as unknown[]
    targetArr.push({ ...currencyRule, required: false })
    const targetArrUs = map["target_rules"] as unknown[]
    targetArrUs.push({ ...currencyRule, required: false })
  }

  if (promotionType === PromotionType.BUYGET) {
    const buyArr = map["buy-rules"] as unknown[]
    buyArr.push(...buyGetBuyRules)
    const buyArrUs = map["buy_rules"] as unknown[]
    buyArrUs.push(...buyGetBuyRules)
    const targetArr = map["target-rules"] as unknown[]
    targetArr.push(...buyGetTargetRules)
    const targetArrUs = map["target_rules"] as unknown[]
    targetArrUs.push(...buyGetTargetRules)
  }

  const attributes = map[ruleType] ?? []

  return res.json({ attributes })
}
