"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Use this component to create a Next.js `<LocalizedClientLink />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href: string
}) => {
  const { locale } = useParams()

  return (
    <Link href={`/${locale}${href}`} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
