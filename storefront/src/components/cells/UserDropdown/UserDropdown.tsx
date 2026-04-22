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
import { useUnreads } from "@talkjs/react"
import { useState } from "react"
import Image from "next/image"

export const UserDropdown = ({
  user,
}: {
  user: HttpTypes.StoreCustomer | null
}) => {
  const [open, setOpen] = useState(false)

  const unreads = useUnreads()

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
                Your account
              </h3>
            </div>
            <NavigationItem href="/user/orders">Orders</NavigationItem>
            <NavigationItem href="/user/messages" className="relative">
              Messages
              {Boolean(unreads?.length) && (
                <Badge className="absolute top-3 left-24 w-4 h-4 p-0">
                  {unreads?.length}
                </Badge>
              )}
            </NavigationItem>
            <NavigationItem href="/user/returns">Returns</NavigationItem>
            <NavigationItem href="/user/addresses">Addresses</NavigationItem>
            <NavigationItem href="/user/reviews">Reviews</NavigationItem>
            <NavigationItem href="/user/wishlist">Wishlist</NavigationItem>
            <Divider />
            <NavigationItem href="/user/settings">Settings</NavigationItem>
            <LogoutButton />
          </div>
        ) : (
          <div className="p-1">
            <NavigationItem href="/user">Login</NavigationItem>
            <NavigationItem href="/user/register">Register</NavigationItem>
          </div>
        )}
      </Dropdown>
    </div>
  )
}
