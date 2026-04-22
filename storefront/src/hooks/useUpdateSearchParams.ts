import { useContext } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FiltersContext } from "@/providers/FiltersProvider"

const useUpdateSearchParams = () => {
  const ctx          = useContext(FiltersContext)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const pathname     = usePathname()

  // Context path: instant, no router navigation
  if (ctx) {
    return (field: string, value: string | null) => ctx.setParam(field, value)
  }

  // Fallback path: router-based (server-rendered pages without FiltersProvider)
  return (field: string, value: string | null) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (!value) sp.delete(field)
    else sp.set(field, value)
    router.push(`${pathname}?${sp}`, { scroll: false })
  }
}

export default useUpdateSearchParams
