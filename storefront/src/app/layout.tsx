import type { Metadata } from "next"
import { Funnel_Display } from "next/font/google"
import "./globals.css"
import { Toaster } from "@medusajs/ui"
import Head from "next/head"
import { Suspense } from "react"
import { CartInitializer } from "./cart-initializer"
import { Providers } from "./providers"

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
})

export const metadata: Metadata = {
  title: {
    template: `%s | ${
      process.env.NEXT_PUBLIC_SITE_NAME ||
      "Kayı.com | Aradığın Her Şey Burada!"
    }`,
    default:
      process.env.NEXT_PUBLIC_SITE_NAME ||
      "Kayı.com | Aradığın Her Şey Burada!",
  },
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "Kayı.com | Güvenli Alşverişin Merkezi",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  alternates: {
    languages: {
      "x-default": process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    },
  },
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  const MEILISEARCH_HOST = process.env.NEXT_PUBLIC_MEILISEARCH_HOST
  const htmlLang = locale || "en"

  return (
    <html lang={htmlLang} className="">
      <Head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://i.imgur.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://i.imgur.com" />
        {MEILISEARCH_HOST && (
          <>
            <link
              rel="preconnect"
              href={MEILISEARCH_HOST}
              crossOrigin="anonymous"
            />
            <link rel="dns-prefetch" href={MEILISEARCH_HOST} />
          </>
        )}
        {/* Image origins for faster LCP */}
        <link
          rel="preconnect"
          href="https://medusa-public-images.s3.eu-west-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://medusa-public-images.s3.eu-west-1.amazonaws.com"
        />
        <link
          rel="preconnect"
          href="https://mercur-connect.s3.eu-central-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://mercur-connect.s3.eu-central-1.amazonaws.com"
        />
        <link
          rel="preconnect"
          href="https://s3.eu-central-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://s3.eu-central-1.amazonaws.com" />
        <link
          rel="preconnect"
          href="https://api.mercurjs.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://api.mercurjs.com" />
      </Head>
      <body
        className={`${funnelDisplay.className} antialiased bg-primary text-secondary relative`}
      >
        <Providers cart={null}>
          {/*
            CartInitializer fetches cart data server-side and injects it via
            CartSynchronizer (a client component). It does NOT wrap children,
            so children are mounted exactly once and event handlers are never
            detached during the cart fetch — eliminating the double-click issue.
          */}
          <Suspense fallback={null}>
            <CartInitializer />
          </Suspense>
          {children}
        </Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
