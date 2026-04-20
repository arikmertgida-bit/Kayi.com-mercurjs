import { CheckMini, EllipseMiniSolid, TriangleRightMini } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { Popover as RadixPopover } from "radix-ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedParams } from "../hooks"
import { useDataTableFilterContext } from "./context"
import FilterChip from "./filter-chip"
import { IFilter } from "./types"

export type TreeOption = {
  label: string
  value: unknown
  children?: TreeOption[]
}

interface CategoryTreeFilterProps extends IFilter {
  options: TreeOption[]
  readonly?: boolean
  multiple?: boolean
}

type TreeNodeProps = {
  option: TreeOption
  depth: number
  selectedParams: ReturnType<typeof useSelectedParams>
  multiple: boolean
}

const TreeNode = ({ option, depth, selectedParams, multiple }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = (option.children ?? []).length > 0
  const isSelected = selectedParams.get().includes(String(option.value))

  const handleSelect = () => {
    if (isSelected) {
      selectedParams.delete(String(option.value))
    } else {
      selectedParams.add(String(option.value))
    }
  }

  return (
    <>
      <div
        className={clx(
          "bg-ui-bg-base hover:bg-ui-bg-base-hover txt-compact-small flex cursor-pointer select-none items-center gap-x-2 rounded-md px-2 py-1.5 outline-none transition-colors",
          { "bg-ui-bg-base-pressed": isSelected }
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 16 + 8}px` : undefined }}
        onClick={handleSelect}
        role="option"
        aria-selected={isSelected}
      >
        <div className="transition-fg flex h-5 w-5 shrink-0 items-center justify-center">
          {isSelected ? (
            <CheckMini className="text-ui-fg-base" />
          ) : (
            <EllipseMiniSolid className="invisible" />
          )}
        </div>
        <span className="flex-1 truncate">{option.label}</span>
        {hasChildren && (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded p-0.5 text-ui-fg-subtle hover:bg-ui-bg-base-hover"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
          >
            <TriangleRightMini
              className={clx(
                "transition-transform will-change-transform",
                { "rotate-90": expanded }
              )}
            />
          </button>
        )}
      </div>
      {expanded &&
        hasChildren &&
        (option.children ?? []).map((child) => (
          <TreeNode
            key={String(child.value)}
            option={child}
            depth={depth + 1}
            selectedParams={selectedParams}
            multiple={multiple}
          />
        ))}
    </>
  )
}

export const CategoryTreeFilter = ({
  filter,
  prefix,
  readonly,
  multiple = true,
  options,
  openOnMount,
}: CategoryTreeFilterProps) => {
  const [open, setOpen] = useState(openOnMount)

  const { t } = useTranslation()
  const { removeFilter } = useDataTableFilterContext()

  const { key, label } = filter
  const selectedParams = useSelectedParams({ param: key, prefix, multiple })
  const currentValue = selectedParams.get()

  const getAllOptions = (opts: TreeOption[]): TreeOption[] =>
    opts.flatMap((o) => [o, ...getAllOptions(o.children ?? [])])

  const allOptions = getAllOptions(options)

  const labelValues = currentValue
    .map((v) => allOptions.find((o) => String(o.value) === v)?.label)
    .filter(Boolean) as string[]

  const [previousValue, setPreviousValue] = useState<string[] | undefined>(labelValues)

  const handleRemove = () => {
    selectedParams.delete()
    removeFilter(key)
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    setPreviousValue(labelValues)

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    if (!isOpen && !currentValue.length) {
      timeoutId = setTimeout(() => {
        removeFilter(key)
      }, 200)
    }
  }

  return (
    <RadixPopover.Root modal open={open} onOpenChange={handleOpenChange}>
      <FilterChip
        hasOperator
        hadPreviousValue={!!previousValue?.length}
        readonly={readonly}
        label={label}
        value={labelValues.length ? labelValues.join(", ") : null}
        onRemove={handleRemove}
      />
      {!readonly && (
        <RadixPopover.Portal>
          <RadixPopover.Content
            hideWhenDetached
            align="start"
            sideOffset={8}
            collisionPadding={8}
            className="bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-[1] h-full max-h-[280px] w-[300px] overflow-hidden rounded-lg outline-none"
            onInteractOutside={(e) => {
              if (e.target instanceof HTMLElement) {
                if (
                  e.target.attributes.getNamedItem("data-name")?.value ===
                  "filters_menu_content"
                ) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }
            }}
          >
            <div
              className="h-full max-h-[280px] min-h-[0] overflow-auto p-1 outline-none"
              role="listbox"
              aria-label={t("fields.category")}
            >
              {options.length === 0 && (
                <span className="txt-compact-small w-full px-2 py-1 text-center text-ui-fg-subtle">
                  {t("general.noResultsTitle")}
                </span>
              )}
              {options.map((option) => (
                <TreeNode
                  key={String(option.value)}
                  option={option}
                  depth={0}
                  selectedParams={selectedParams}
                  multiple={multiple}
                />
              ))}
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      )}
    </RadixPopover.Root>
  )
}
