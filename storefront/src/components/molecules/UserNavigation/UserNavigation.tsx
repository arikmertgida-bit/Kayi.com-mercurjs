"use client"
import { LogoutButton } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { useMessengerUnreadCount } from "@/providers/MessengerProvider"
import { useParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

const navigationItems = [
  { key: "orders", href: "/user/orders" },
  { key: "messages", href: "/user/messages" },
  { key: "returns", href: "/user/returns" },
  { key: "addresses", href: "/user/addresses" },
  { key: "reviews", href: "/user/reviews" },
  { key: "wishlist", href: "/user/wishlist" },
  { key: "following", href: "/user/following" },
  { key: "settings", href: "/user/settings" },
]

export const UserNavigation = () => {
  const count = useMessengerUnreadCount()
  const path = usePathname()
  const { locale } = useParams()
  const t = useTranslations('navigation')

  return (
    <div className="bg-white py-3">
      <div className="container">
        <div className="flex flex-wrap items-center gap-2">
          {navigationItems.map((item) => {
            const localizedHref = `/${locale}${item.href}`
            const isActive =
              path === localizedHref ||
              path.startsWith(`${localizedHref}/`)

            return (
              <LocalizedClientLink
                key={item.key}
                href={item.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-opacity rounded-[8px] hover:opacity-80 text-[#fcfcfc]",
                  isActive ? "bg-[#e30a17]" : "bg-[#000000]"
                )}
              >
                {t(item.key as any)}
                {item.key === "messages" && count > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-white text-black rounded-full">
                    {count}
                  </span>
                )}
              </LocalizedClientLink>
            )
          })}

          <div className="ml-auto">
            <LogoutButton
              className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-[8px] transition-opacity hover:opacity-80 bg-[#000000] text-[#fcfcfc]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
