"use client"

import { Input } from "@/components/atoms"
import { SearchIcon } from "@/icons"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { redirect } from "next/navigation"

export const NavbarSearch = () => {
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("query") || "")

  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (search) {
      redirect(`/categories?query=${search}`)
    } else {
      redirect(`/categories`)
    }
  }

  return (
    <form className="flex items-center w-full" method="POST" onSubmit={submitHandler}>
      <div className="w-4/5 mx-auto">
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
