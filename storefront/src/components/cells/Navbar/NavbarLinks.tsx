"use client"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

// Dot indicator: small filled circle in brand red
function RedDot() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2 h-2 rounded-full bg-[#e30a17] flex-shrink-0"
    />
  )
}

export default function NavbarLinks() {
  const pathname = usePathname()
  const t = useTranslations('categories')

  // Active detection helpers
  const isActive = (href: string) => {
    // strip locale prefix (e.g. /tr) for comparison
    const stripped = pathname?.replace(/^\/[a-z]{2}(\/|$)/, "/") ?? ""
    return stripped === href || stripped.startsWith(href + "/")
  }

  const baseClass =
    "flex items-center gap-1.5 font-semibold text-gray-800 uppercase text-[13px] tracking-wide px-3 py-1 rounded-sm transition-colors duration-150 hover:text-[#e30a17]"
  const activeClass = "text-[#e30a17]"

  return (
    <>
      {/* All Products */}
      <LocalizedClientLink
        href="/categories"
        className={cn(baseClass, isActive("/categories") && activeClass)}
      >
        <RedDot />
        {t('allProducts')}
      </LocalizedClientLink>

    </>
  )
}
