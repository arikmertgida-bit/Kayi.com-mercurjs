import { Input } from "@medusajs/ui"
import { ChangeEvent, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import { debounce } from "lodash"
import { useSelectedParams } from "../hooks"

type DataTableSearchProps = {
  placeholder?: string
  prefix?: string
  autofocus?: boolean
}

export const DataTableSearch = ({
  placeholder,
  prefix,
  autofocus,
}: DataTableSearchProps) => {
  const { t } = useTranslation()
  const placeholderText = placeholder || t("general.search")
  const selectedParams = useSelectedParams({
    param: "q",
    prefix,
    multiple: false,
  })

  const query = selectedParams.get()

  const selectedParamsRef = useRef(selectedParams)
  selectedParamsRef.current = selectedParams

  const debouncedSearch = useRef(
    debounce((value: string) => {
      if (!value || value.length < 2) {
        selectedParamsRef.current.delete()
      } else {
        selectedParamsRef.current.add(value)
      }
    }, 300)
  ).current

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value)
  }

  return (
    <Input
      autoComplete="off"
      name="q"
      type="search"
      size="small"
      autoFocus={autofocus}
      defaultValue={query?.[0] || undefined}
      onChange={handleChange}
      placeholder={placeholderText}
    />
  )
}
