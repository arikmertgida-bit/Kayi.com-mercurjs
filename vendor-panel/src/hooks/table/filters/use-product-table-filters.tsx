import { useTranslation } from "react-i18next"
import { Filter } from "../../../components/table/data-table"
import { TreeOption } from "../../../components/table/data-table/data-table-filter/category-tree-filter"
import { useCollections, useProductCategories, useProductTags } from "../../api"
import { useProductTypes } from "../../api/product-types"

const excludeableFields = [
  "collections",
  "categories",
  "product_types",
  "product_tags",
  "sales_channel_id",
] as const

export const useProductTableFilters = (
  exclude?: (typeof excludeableFields)[number][]
) => {
  const { t } = useTranslation()

  const isProductTypeExcluded = exclude?.includes("product_types")

  const { product_types } = useProductTypes(
    {
      limit: 1000,
      offset: 0,
    },
    {
      enabled: !isProductTypeExcluded,
    }
  )

  const isProductTagExcluded = exclude?.includes("product_tags")

  const { product_tags } = useProductTags({
    limit: 1000,
    offset: 0,
  })

  const isCategoryExcluded = exclude?.includes("categories")

  const { product_categories } = useProductCategories(
    {
      limit: 1000,
      offset: 0,
      include_descendants_tree: true,
    } as any,
    {
      enabled: !isCategoryExcluded,
    }
  )

  const isCollectionExcluded = exclude?.includes("collections")

  const { product_collections: collections } = useCollections(
    {
      limit: 1000,
      offset: 0,
    },
    {
      enabled: !isCollectionExcluded,
    }
  )

  let filters: Filter[] = []

  if (product_types && !isProductTypeExcluded) {
    const typeFilter: Filter = {
      key: "type_id",
      label: t("fields.type"),
      type: "select",
      multiple: true,
      options: product_types.map((t) => ({
        label: t.value,
        value: t.id,
      })),
    }

    filters = [...filters, typeFilter]
  }

  if (product_tags && !isProductTagExcluded) {
    const tagFilter: Filter = {
      key: "tag_id",
      label: t("fields.tag"),
      type: "select",
      multiple: true,
      options: product_tags.map((t) => ({
        label: t.value,
        value: t.id,
      })),
    }

    filters = [...filters, tagFilter]
  }

  if (product_categories) {
    type CategoryItem = {
      id: string
      name: string
      parent_category_id?: string | null
      category_children?: CategoryItem[]
    }
    const buildTreeOptions = (cats: CategoryItem[]): TreeOption[] =>
      cats.filter(Boolean).map((c) => ({
        label: c?.name ?? "",
        value: c?.id ?? "",
        children: c.category_children?.length
          ? buildTreeOptions(c.category_children)
          : undefined,
      }))

    // Sadece root kategorileri al (parent_category_id olmayan)
    const rootCategories = (product_categories as CategoryItem[]).filter(
      (c) => c && !c.parent_category_id
    )

    const categoryFilter: Filter = {
      key: "category_id",
      label: t("fields.category"),
      type: "category-tree",
      multiple: true,
      options: buildTreeOptions(rootCategories),
    }

    filters = [...filters, categoryFilter]
  }

  if (collections) {
    const collectionFilter: Filter = {
      key: "collection_id",
      label: t("fields.collection"),
      type: "select",
      multiple: true,
      options: (Array.isArray(collections) ? collections : []).map((c) => ({
        label: c.title,
        value: c.id,
      })),
    }

    filters = [...filters, collectionFilter]
  }

  const statusFilter: Filter = {
    key: "status",
    label: t("fields.status"),
    type: "select",
    multiple: true,
    options: [
      {
        label: t("products.productStatus.draft"),
        value: "draft",
      },
      {
        label: t("products.productStatus.proposed"),
        value: "proposed",
      },
      {
        label: t("products.productStatus.published"),
        value: "published",
      },
      {
        label: t("products.productStatus.rejected"),
        value: "rejected",
      },
    ],
  }

  filters = [...filters, statusFilter]

  return filters
}
