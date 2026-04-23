import { sdk } from "@/lib/config"
import { HttpTypes } from "@medusajs/types"

interface CategoriesProps {
  query?: Record<string, any>
  headingCategories?: string[]
}

export const listCategories = async ({
  query,
  headingCategories = [],
}: Partial<CategoriesProps> = {}) => {
  const limit = query?.limit || 100

  const categories = await sdk.client
    .fetch<{
      product_categories: HttpTypes.StoreProductCategory[]
    }>("/store/product-categories", {
      query: {
        fields: "handle, name, rank, parent_category_id",
        limit,
        ...query,
      },
      cache: "force-cache",
      next: { revalidate: 3600 },
    })
    .then(({ product_categories }) => product_categories)

  const parentCategories = categories.filter(({ name }) =>
    headingCategories.includes(name.toLowerCase())
  )

  const childrenCategories = categories.filter(
    ({ name }) => !headingCategories.includes(name.toLowerCase())
  )

  return {
    categories: childrenCategories.filter(
      ({ parent_category_id }) => !parent_category_id
    ),
    parentCategories: parentCategories,
  }
}

export const listMegaMenuCategories = async () => {
  const { product_categories } = await sdk.client.fetch<{
    product_categories: HttpTypes.StoreProductCategory[]
  }>("/store/product-categories", {
    query: {
      fields: "id,handle,name,rank,parent_category_id,thumbnail,+metadata,*category_children,category_children.id,category_children.handle,category_children.name",
      limit: 100,
    },
    cache: "force-cache",
    next: { revalidate: 3600 },
  })

  return product_categories
    .filter((c) => !c.parent_category_id)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children,*category_children.category_children,+metadata",
          handle,
        },
        cache: "force-cache",
        next: { revalidate: 300 },
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
