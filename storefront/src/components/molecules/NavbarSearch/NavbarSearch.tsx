"use client"

import { Input } from "@/components/atoms"
import { SearchIcon } from "@/icons"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

export const NavbarSearch = () => {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.countryCode as string) || (params?.locale as string) || process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr"

  const [search, setSearch] = useState("")

  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = search.trim()
    if (trimmed) {
      router.push(`/${locale}/categories?query=${encodeURIComponent(trimmed)}`)
    } else {
      router.push(`/${locale}/categories`)
    }
    setSearch("")
  }

  return (
    <form className="flex items-center w-full" onSubmit={submitHandler}>
      <div className="w-full lg:w-4/5 lg:mx-auto">
        <Input
          icon={<SearchIcon />}
          placeholder="Search product"
          value={search}
          changeValue={setSearch}
          className="border-black focus:border-[#e30a17]"
        />
      </div>
      <input type="submit" className="hidden" />
    </form>
  )
}
