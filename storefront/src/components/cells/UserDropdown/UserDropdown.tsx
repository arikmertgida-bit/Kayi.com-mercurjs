"use client"

import {
  Badge,
  Divider,
  LogoutButton,
  NavigationItem,
} from "@/components/atoms"
import { Dropdown } from "@/components/molecules"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ProfileIcon } from "@/icons"
import { HttpTypes } from "@medusajs/types"
import { useMessengerUnreadCount } from "@/providers/MessengerProvider"
import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"

export const UserDropdown = ({
  user,
}: {
  user: HttpTypes.StoreCustomer | null
}) => {
  const [open, setOpen] = useState(false)
  const t = useTranslations('userDropdown')
  const unreadCount = useMessengerUnreadCount()

  const avatarSrc = user
    ? ((user.metadata as any)?.avatar_url ||
        "/images/customer-default-avatar.jpg")
    : null

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/user"
        className="relative flex items-center"
        aria-label="Go to user profile"
      >
        {avatarSrc ? (
          <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
            <Image
              src={avatarSrc}
              alt="Profil"
              width={28}
              height={28}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
        ) : (
          <ProfileIcon size={20} />
        )}
      </LocalizedClientLink>
      <Dropdown show={open}>
        {user ? (
          <div className="p-1">
            <div className="lg:w-[200px]">
              <h3 className="uppercase heading-xs border-b p-4">
                {t('yourAccount')}
              </h3>
            </div>
            <NavigationItem href="/user/orders">{t('orders')}</NavigationItem>
            <NavigationItem href="/user/messages" className="relative">
              {t('messages')}
              {unreadCount > 0 && (
                <Badge className="absolute top-3 left-24 w-4 h-4 p-0">
                  {unreadCount}
                </Badge>
              )}
            </NavigationItem>
            <NavigationItem href="/user/returns">{t('returns')}</NavigationItem>
            <NavigationItem href="/user/addresses">{t('addresses')}</NavigationItem>
            <NavigationItem href="/user/reviews">{t('reviews')}</NavigationItem>
            <NavigationItem href="/user/wishlist">{t('wishlist')}</NavigationItem>
            <Divider />
            <NavigationItem href="/user/settings">{t('settings')}</NavigationItem>
            <LogoutButton />
          </div>
        ) : (
          <div className="p-1">
            <NavigationItem href="/user">{t('login')}</NavigationItem>
            <NavigationItem href="/user/register">{t('register')}</NavigationItem>
          </div>
        )}
      </Dropdown>
    </div>
  )
}
