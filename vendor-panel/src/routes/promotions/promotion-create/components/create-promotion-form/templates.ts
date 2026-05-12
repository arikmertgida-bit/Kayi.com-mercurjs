const commonHiddenFields = [
  "type",
  "application_method.type",
  "application_method.allocation",
]

const amountOfProductHiddenFields = [...commonHiddenFields]

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
]
