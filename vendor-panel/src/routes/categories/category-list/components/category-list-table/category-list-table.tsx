import { TriangleRightMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Input, Table, Text, clx } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { useProductCategories } from "../../../../../hooks/api/categories"

const PAGE_SIZE = 200

type CategoryItem = HttpTypes.AdminProductCategory & {
  category_children?: CategoryItem[] | null
}

const matchesSearch = (category: CategoryItem, query: string): boolean => {
  const q = query.toLowerCase()
  if (
    category.name?.toLowerCase().includes(q) ||
    category.handle?.toLowerCase().includes(q)
  ) {
    return true
  }
  return (category.category_children ?? []).some((child) =>
    matchesSearch(child, q)
  )
}

const CategoryRow = ({
  category,
  depth = 0,
  searchQuery = "",
}: {
  category: CategoryItem
  depth?: number
  searchQuery?: string
}) => {
  const navigate = useNavigate()
  const hasSearch = searchQuery.trim().length > 0
  const [isExpanded, setIsExpanded] = useState(false)

  const children = (category.category_children ?? []).filter((child) =>
    hasSearch ? matchesSearch(child, searchQuery) : true
  )
  const hasChildren = children.length > 0

  const expanded = hasSearch ? hasChildren : isExpanded

  return (
    <>
      <Table.Row
        className={clx("transition-fg cursor-pointer", {
          "bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover": depth % 2 !== 0,
        })}
        onClick={() => navigate(category.id)}
      >
        <Table.Cell
          style={{
            paddingLeft: depth > 0 ? `${depth * 32 + 24}px` : undefined,
          }}
        >
          <div className="flex size-full items-center gap-x-2">
            <div className="flex size-7 shrink-0 items-center justify-center">
              {(hasChildren || (category.category_children ?? []).length > 0) && !hasSearch && (
                <button
                  type="button"
                  className="flex items-center justify-center rounded p-1 text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded((v) => !v)
                  }}
                >
                  <TriangleRightMini
                    className={clx("transition-transform will-change-transform", {
                      "rotate-90": isExpanded,
                    })}
                  />
                </button>
              )}
              {hasSearch && hasChildren && (
                <TriangleRightMini className="rotate-90 text-ui-fg-subtle" />
              )}
            </div>
            <span className="truncate text-sm">{category.name}</span>
          </div>
        </Table.Cell>
        <Table.Cell>
          <Text size="small" className="text-ui-fg-subtle">
            /{category.handle}
          </Text>
        </Table.Cell>
      </Table.Row>
      {expanded &&
        children.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            depth={depth + 1}
            searchQuery={searchQuery}
          />
        ))}
    </>
  )
}

export const CategoryListTable = () => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")

  const { product_categories, isLoading, isError, error } = useProductCategories(
    {
      include_descendants_tree: true,
      limit: PAGE_SIZE,
    },
    { placeholderData: keepPreviousData }
  )

  const rootCategories = useMemo(() => {
    const roots = (product_categories ?? []).filter((c) => !c.parent_category_id)
    if (!searchQuery.trim()) return roots
    return roots.filter((c) => matchesSearch(c as CategoryItem, searchQuery))
  }, [product_categories, searchQuery])

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("categories.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Organize products into categories.
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="create">Request Category</Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-end px-6 py-3">
        <Input
          type="search"
          size="small"
          autoComplete="off"
          placeholder={t("general.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-52"
        />
      </div>
      <Table>
        <Table.Header className="border-t-0">
          <Table.Row>
            <Table.HeaderCell>{t("fields.name")}</Table.HeaderCell>
            <Table.HeaderCell>{t("fields.handle")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body className="border-b-0">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Table.Row key={i}>
                  <Table.Cell>
                    <div className="bg-ui-bg-subtle h-4 w-32 animate-pulse rounded" />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="bg-ui-bg-subtle h-4 w-20 animate-pulse rounded" />
                  </Table.Cell>
                </Table.Row>
              ))
            : rootCategories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category as CategoryItem}
                  searchQuery={searchQuery}
                />
              ))}
        </Table.Body>
      </Table>
    </Container>
  )
}


