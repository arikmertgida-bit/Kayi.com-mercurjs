"use client"
import { Chip } from "@/components/atoms"
import useFilters from "@/hooks/useFilters"
import { CloseIcon } from "@/icons"
import { useTranslations } from "next-intl"

export const ActiveFilterElement = ({ filter }: { filter: string[] }) => {
  const { updateFilters } = useFilters(filter[0])
  const t = useTranslations('filters')

  const filtersLabels: Record<string, string> = {
    category: t('category'),
    brand: t('brand'),
    min_price: t('minPrice'),
    max_price: t('maxPrice'),
    color: t('color'),
    size: t('size'),
    query: t('search'),
    condition: t('condition'),
    rating: t('rating'),
  }

  const activeFilters = filter[1].split(",")

  const removeFilterHandler = (filter: string) => {
    updateFilters(filter)
  }

  return (
    <div className="flex gap-2 items-center mb-4">
      <span className="label-md hidden md:inline-block">
        {filtersLabels[filter[0] as keyof typeof filtersLabels]}:
      </span>
      {activeFilters.map((element) => {
        const Element = () => {
          return (
            <span className="flex gap-2 items-center cursor-default whitespace-nowrap">
              {element}{" "}
              <span onClick={() => removeFilterHandler(element)}>
                <CloseIcon size={16} className="cursor-pointer" />
              </span>
            </span>
          )
        }
        return <Chip key={element} value={<Element />} />
      })}
    </div>
  )
}
