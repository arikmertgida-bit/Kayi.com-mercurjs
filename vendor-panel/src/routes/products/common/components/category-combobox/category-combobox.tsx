import { EllipseMiniSolid, TriangleRightMini, TrianglesMini } from "@medusajs/icons"
import { AdminProductCategoryResponse } from "@medusajs/types"
import { Text, clx } from "@medusajs/ui"
import { Popover as RadixPopover } from "radix-ui"
import {
  CSSProperties,
  ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Trans, useTranslation } from "react-i18next"
import { TextSkeleton } from "../../../../../components/common/skeleton"
import { useProductCategories } from "../../../../../hooks/api/categories"
import { useDebouncedSearch } from "../../../../../hooks/use-debounced-search"

interface CategoryComboboxProps
  extends Omit<
    ComponentPropsWithoutRef<"input">,
    "value" | "defaultValue" | "onChange"
  > {
  value: string[]
  onChange: (value: string[]) => void
}

type CategoryNode = AdminProductCategoryResponse["product_category"] & {
  category_children?: CategoryNode[]
}

const TABLUAR_NUM_WIDTH = 8
const TAG_BASE_WIDTH = 28

export const CategoryCombobox = forwardRef<
  HTMLInputElement,
  CategoryComboboxProps
>(({ value, onChange, className, ...props }, ref) => {
  const innerRef = useRef<HTMLInputElement>(null)
  useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(
    ref,
    () => innerRef.current,
    []
  )

  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { i18n, t } = useTranslation()
  const { searchValue, onSearchValueChange, query } = useDebouncedSearch()

  // Tek fetch: limit:500 ile tum kategoriler, category_children ile agac kuruyoruz
  const { product_categories: allCategories, isPending, isError, error } =
    useProductCategories(
      { limit: 500, include_descendants_tree: true },
      { enabled: open }
    )

  const [showLoading, setShowLoading] = useState(false)
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined
    if (isPending) {
      setShowLoading(true)
    } else {
      id = setTimeout(() => setShowLoading(false), 150)
    }
    return () => clearTimeout(id)
  }, [isPending])

  // Sadece kok (parent_category_id === null) olan kategoriler agacin tepesi
  const rootCategories = useMemo((): CategoryNode[] => {
    if (!allCategories) return []
    return (allCategories as CategoryNode[]).filter(
      (c) => !c.parent_category_id || c.parent_category_id === null
    )
  }, [allCategories])

  // Arama icin tum kategorileri duz liste yap (sadece rootCategories'den traverse et, duplicate olmaz)
  const flatOptions = useMemo((): FlatOption[] => {
    return flattenCategories(rootCategories)
  }, [rootCategories])

  const searchResults = useMemo((): FlatOption[] => {
    if (!searchValue) return []
    const lower = searchValue.toLowerCase()
    return flatOptions.filter((o) => o.label.toLowerCase().includes(lower))
  }, [flatOptions, searchValue])

  function handleOpenChange(next: boolean) {
    if (!next) {
      onSearchValueChange("")
    }
    if (next) {
      requestAnimationFrame(() => innerRef.current?.focus())
    }
    setOpen(next)
  }

  function handleSelect(id: string) {
    handleOpenChange(false)
    onChange(value.includes(id) ? [] : [id])
  }

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const showTag = value.length > 0
  const showSelected = !open && value.length > 0

  const tagWidth = useMemo(() => {
    const count = value.length
    const digits = count.toString().length
    return TAG_BASE_WIDTH + digits * TABLUAR_NUM_WIDTH
  }, [value])

  if (isError) throw error

  const selectedLabel = useMemo(
    () => flatOptions.find((o) => o.value === value[0])?.label ?? null,
    [flatOptions, value]
  )

  return (
    <RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
      <RadixPopover.Anchor
        asChild
        onClick={() => { if (!open) handleOpenChange(true) }}
      >
        <div
          data-anchor="true"
          className={clx(
            "relative flex cursor-pointer items-center gap-x-2 overflow-hidden",
            "h-8 w-full rounded-md",
            "bg-ui-bg-field transition-fg shadow-borders-base",
            "has-[input:focus]:shadow-borders-interactive-with-active",
            "has-[:invalid]:shadow-borders-error has-[[aria-invalid=true]]:shadow-borders-error",
            "has-[:disabled]:bg-ui-bg-disabled has-[:disabled]:text-ui-fg-disabled has-[:disabled]:cursor-not-allowed",
            { "shadow-borders-interactive-with-active": open },
            className
          )}
          style={{ "--tag-width": `${tagWidth}px` } as CSSProperties}
        >
          {showSelected && (
            <div className="pointer-events-none absolute inset-y-0 left-2 flex size-full items-center">
              <Text size="small" leading="compact">{selectedLabel}</Text>
            </div>
          )}
          <input
            ref={innerRef}
            value={searchValue}
            onChange={(e) => onSearchValueChange(e.target.value)}
            className={clx(
              "txt-compact-small size-full cursor-pointer appearance-none bg-transparent pr-8 outline-none",
              "hover:bg-ui-bg-field-hover focus:cursor-text placeholder:text-ui-fg-muted",
              showTag ? "pl-[calc(var(--tag-width)+8px)]" : "pl-2"
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => handleOpenChange(true)}
            className="text-ui-fg-muted transition-fg hover:bg-ui-bg-field-hover absolute right-0 flex size-8 items-center justify-center rounded-r outline-none"
          >
            <TrianglesMini className="text-ui-fg-muted" />
          </button>
        </div>
      </RadixPopover.Anchor>

      <RadixPopover.Content
        sideOffset={4}
        role="listbox"
        className={clx(
          "shadow-elevation-flyout bg-ui-bg-base z-50 w-[var(--radix-popper-anchor-width)] rounded-[8px]",
          "max-h-[320px] overflow-y-auto",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        )}
        onInteractOutside={(e) => {
          e.preventDefault()
          const target = e.target as HTMLElement
          if (target.closest("[data-anchor]")) return
          handleOpenChange(false)
        }}
      >
        <div className="p-1">
          {showLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[28px_1fr] gap-2 px-2 py-1.5">
                <div />
                <TextSkeleton size="small" leading="compact" />
              </div>
            ))}

          {/* Arama sonuclari */}
          {!showLoading && searchValue && (
            searchResults.length === 0 ? (
              <div className="px-2 py-1.5">
                <Text size="small" leading="compact">
                  {query ? (
                    <Trans
                      i18n={i18n}
                      i18nKey={"general.noResultsTitle"}
                      tOptions={{ query }}
                      components={[<span className="font-medium" key="q" />]}
                    />
                  ) : (
                    t("general.noResultsTitle")
                  )}
                </Text>
              </div>
            ) : (
              searchResults.map((opt) => (
                <CategoryRow
                  key={opt.value}
                  id={opt.value}
                  label={opt.label}
                  depth={0}
                  hasChildren={false}
                  isExpanded={false}
                  isSelected={value.includes(opt.value)}
                  onSelect={handleSelect}
                  onToggle={() => {}}
                />
              ))
            )
          )}

          {/* Normal agac gorunumu (arama yokken) */}
          {!showLoading && !searchValue && (
            rootCategories.length > 0 ? (
              rootCategories.map((cat) => (
                <CategoryTreeNode
                  key={cat.id}
                  node={cat}
                  depth={0}
                  expanded={expanded}
                  selected={value}
                  onSelect={handleSelect}
                  onToggle={toggleExpand}
                />
              ))
            ) : (
              !isPending && (
                <div className="px-2 py-1.5">
                  <Text size="small" leading="compact">
                    {t("general.noResultsTitle")}
                  </Text>
                </div>
              )
            )
          )}
        </div>
      </RadixPopover.Content>
    </RadixPopover.Root>
  )
})

CategoryCombobox.displayName = "CategoryCombobox"

// ── Alt bilesenler ────────────────────────────────────────────────

type CategoryRowProps = {
  id: string
  label: string
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  onToggle: (id: string, e: React.MouseEvent) => void
}

function CategoryRow({
  id,
  label,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  onSelect,
  onToggle,
}: CategoryRowProps) {
  return (
    <div
      className="flex items-center"
      style={{ paddingLeft: `${depth * 16}px` }}
    >
      <div className="flex size-6 shrink-0 items-center justify-center">
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => onToggle(id, e)}
            className="flex size-5 items-center justify-center rounded text-ui-fg-muted hover:bg-ui-bg-base-hover transition-colors"
          >
            <TriangleRightMini
              className={clx("transition-transform duration-150", {
                "rotate-90": isExpanded,
              })}
            />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        role="option"
        tabIndex={-1}
        onClick={() => onSelect(id)}
        className={clx(
          "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none",
          "hover:bg-ui-bg-field-hover transition-colors"
        )}
      >
        <div className="flex size-5 shrink-0 items-center justify-center">
          {isSelected && <EllipseMiniSolid />}
        </div>
        <Text as="span" size="small" leading="compact" className="truncate">
          {label}
        </Text>
      </button>
    </div>
  )
}

type CategoryTreeNodeProps = {
  node: CategoryNode
  depth: number
  expanded: Set<string>
  selected: string[]
  onSelect: (id: string) => void
  onToggle: (id: string, e: React.MouseEvent) => void
}

function CategoryTreeNode({
  node,
  depth,
  expanded,
  selected,
  onSelect,
  onToggle,
}: CategoryTreeNodeProps) {
  const hasChildren = (node.category_children?.length ?? 0) > 0
  const isExpanded = expanded.has(node.id)

  return (
    <>
      <CategoryRow
        id={node.id}
        label={node.name}
        depth={depth}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        isSelected={selected.includes(node.id)}
        onSelect={onSelect}
        onToggle={onToggle}
      />
      {hasChildren && isExpanded &&
        node.category_children!.map((child) => (
          <CategoryTreeNode
            key={child.id}
            node={child as CategoryNode}
            depth={depth + 1}
            expanded={expanded}
            selected={selected}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))
      }
    </>
  )
}

// ── Yardimci fonksiyonlar ─────────────────────────────────────────

type FlatOption = { value: string; label: string }

function flattenCategories(
  cats: CategoryNode[],
  acc: FlatOption[] = []
): FlatOption[] {
  for (const cat of cats) {
    acc.push({ value: cat.id, label: cat.name })
    if (cat.category_children?.length) {
      flattenCategories(cat.category_children, acc)
    }
  }
  return acc
}