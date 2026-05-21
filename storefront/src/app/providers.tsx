"use client"

import { CartProvider } from "@/components/providers"
import { AgeVerificationProvider } from "@/providers/AgeVerificationProvider"
import { MeiliSearchProvider } from "@/providers/MeiliSearchProvider"
import { Cart } from "@/types/cart"
import type React from "react"

import { PropsWithChildren } from "react"

interface ProvidersProps extends PropsWithChildren {
  cart: Cart | null
  meiliConfig: { host: string; key: string }
  ageVerified?: boolean
}

export function Providers({ children, cart, meiliConfig, ageVerified = false }: ProvidersProps) {
  return (
    <MeiliSearchProvider host={meiliConfig.host} apiKey={meiliConfig.key}>
      <AgeVerificationProvider initialVerified={ageVerified}>
        <CartProvider cart={cart}>{children}</CartProvider>
      </AgeVerificationProvider>
    </MeiliSearchProvider>
  )
}
