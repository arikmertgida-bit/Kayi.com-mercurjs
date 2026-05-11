const commonHiddenFields = [
  "type",
  "application_method.type",
  "application_method.allocation",
]

const amountOfProductHiddenFields = [...commonHiddenFields]
const amountOfOrderHiddenFields = [...commonHiddenFields]

const percentageOfProductHiddenFields = [
  ...commonHiddenFields,
  "is_tax_inclusive",
]
const percentageOfOrderHiddenFields = [
  ...commonHiddenFields,
  "is_tax_inclusive",
]

const buyGetHiddenFields = [
  ...commonHiddenFields,
  "application_method.value",
  "is_tax_inclusive",
]

export const templates = [
  {
    id: "amount_off_products",
    type: "standard",
    title: "Amount off products",
    titleKey: "promotions.templates.amountOffProducts.title",
    description: "Discount specific products or collection of products",
    descriptionKey: "promotions.templates.amountOffProducts.description",
    hiddenFields: amountOfProductHiddenFields,
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "each",
        target_type: "items",
        type: "fixed",
      },
    },
  },
  {
    id: "amount_off_order",
    type: "standard",
    title: "Amount off order",
    titleKey: "promotions.templates.amountOffOrder.title",
    description: "Discounts the total order amount",
    descriptionKey: "promotions.templates.amountOffOrder.description",
    hiddenFields: amountOfOrderHiddenFields,
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "across",
        target_type: "order",
        type: "fixed",
      },
    },
  },
  {
    id: "percentage_off_product",
    type: "standard",
    title: "Percentage off product",
    titleKey: "promotions.templates.percentageOffProduct.title",
    description: "Discounts a percentage off selected products",
    descriptionKey: "promotions.templates.percentageOffProduct.description",
    hiddenFields: percentageOfProductHiddenFields,
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "each",
        target_type: "items",
        type: "percentage",
      },
    },
  },
  {
    id: "percentage_off_order",
    type: "standard",
    title: "Percentage off order",
    titleKey: "promotions.templates.percentageOffOrder.title",
    description: "Discounts a percentage of the total order amount",
    descriptionKey: "promotions.templates.percentageOffOrder.description",
    hiddenFields: percentageOfOrderHiddenFields,
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "across",
        target_type: "order",
        type: "percentage",
      },
    },
  },
  {
    id: "buy_get",
    type: "buy_get",
    title: "Buy X Get Y",
    titleKey: "promotions.templates.buyXGetY.title",
    description: "Buy X product(s), get Y product(s)",
    descriptionKey: "promotions.templates.buyXGetY.description",
    hiddenFields: buyGetHiddenFields,
    defaults: {
      is_automatic: "false",
      type: "buyget",
      application_method: {
        type: "percentage",
        value: 100,
        apply_to_quantity: 1,
        max_quantity: 1,
      },
    },
  },
  // {
  //   id: "shipping_discount",
  //   type: "standard",
  //   title: "Free shipping",
  //   titleKey: "promotions.templates.freeShipping.title",
  //   description: "Applies a 100% discount to shipping fees",
  //   descriptionKey: "promotions.templates.freeShipping.description",
  //   hiddenFields: [...commonHiddenFields, "application_method.value", "is_tax_inclusive"],
  //   defaults: {
  //     is_automatic: "false",
  //     type: "standard",
  //     application_method: {
  //       allocation: "across",
  //       target_type: "shipping_methods",
  //       type: "percentage",
  //       value: 100,
  //     },
  //   },
  // },
]
