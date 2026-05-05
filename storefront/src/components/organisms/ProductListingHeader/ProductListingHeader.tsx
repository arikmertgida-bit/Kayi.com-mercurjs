"use client"
import { SelectField } from "@/components/molecules"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

const selectOptions = [
  { label: "Newest", value: "created_at" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
]

export const ProductListingHeader = ({ total }: { total: number }) => {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('listing')

  const selectOptionHandler = (value: string) => {
    router.push(`${pathname}?sortBy=${value}`)
  }

  return (
    <div className="flex justify-between w-full items-center">
      <div>{t('listingsCount', { total })}</div>
      {/* <div className='hidden md:flex gap-2 items-center'>
        Sort by:{' '}
        <SelectField
          className='min-w-[200px]'
          options={selectOptions}
          selectOption={selectOptionHandler}
        />
      </div> */}
    </div>
  )
}
