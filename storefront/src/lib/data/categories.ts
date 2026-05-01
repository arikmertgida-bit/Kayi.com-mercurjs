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
  // Default limit raised to 500: the flat list includes both parent and child
  // categories. With 12 parents × ~10 children ≈ 132 records, the old limit
  // of 100 silently dropped the last 2 parent categories.
  const limit = query?.limit || 500

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
      fields: "id,handle,name,rank,parent_category_id,thumbnail,+metadata,*category_children,category_children.id,category_children.handle,category_children.name,category_children.rank",
      // limit applies to the FLAT list (parents + all children combined).
      // With 12 parent categories × ~10 children each ≈ 132 total records.
      // The old limit of 100 cut off the last 2 parent categories (KİTAP & HOBİ, ÖZEL YAŞAM).
      limit: 500,
    },
    next: { revalidate: 60 },
    cache: "force-cache",
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
