"use client"

import { Accordion, FilterCheckboxOption } from "@/components/molecules"
import useFilters from "@/hooks/useFilters"

const filters = [
  { label: "Yeni", amount: 78 },
  { label: "Yeni - Etiketli", amount: 40 },
  { label: "İkinci El - Mükemmel", amount: 7 },
  { label: "İkinci El - İyi", amount: 16 },
  { label: "İkinci El - Orta", amount: 0 },
]

export const ConditionFilter = () => {
  const { updateFilters, isFilterActive } = useFilters("condition")

  const selectHandler = (option: string) => {
    updateFilters(option)
  }

  return (
    <Accordion heading="Durum">
      <ul className="px-4">
        {filters.map(({ label, amount }) => (
          <li key={label} className="mb-4">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!amount)}
              onCheck={selectHandler}
              label={label}
              amount={amount}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}
