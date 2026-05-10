import {
  BlogSection,
  CollectionProductSection,
  HeroSlider,
  HomeCategories,
  HomeProductSection,
} from "@/components/sections"

import type { Metadata } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import Script from "next/script"
import { listRegions } from "@/lib/data/regions"
import { toHreflang } from "@/lib/helpers/hreflang"

/**
 * CLS-safe skeleton for collection product sliders.
 * min-height reserves space while the server component resolves,
 * preventing layout shift when content loads.
 */
function CollectionSliderSkeleton() {
  return (
    <div className="py-4 w-full" style={{ minHeight: "320px" }}>
      <div className="h-7 w-44 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="home-slider-slide flex-shrink-0 animate-pulse"
          >
            <div className="border rounded-sm p-1">
              <div className="aspect-square w-full bg-gray-200 rounded-sm" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded-sm w-3/4" />
                <div className="h-4 bg-gray-200 rounded-sm w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = headersList.get("x-forwarded-proto") || "https"
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

  // Build alternates based on available regions (locales)
  let languages: Record<string, string> = {}
  try {
    const regions = await listRegions()
    const locales = Array.from(
      new Set(
        (regions || [])
          .map((r) => r.countries?.map((c) => c.iso_2) || [])
          .flat()
          .filter(Boolean)
      )
    ) as string[]

    languages = locales.reduce<Record<string, string>>((acc, code) => {
      const hrefLang = toHreflang(code)
      acc[hrefLang] = `${baseUrl}/${code}`
      return acc
    }, {})
  } catch {
    // Fallback: only current locale
    languages = { [toHreflang(locale)]: `${baseUrl}/${locale}` }
  }

  const title = "Ana Sayfa"
  const description =
    "Kayı.com | Güvenli Alşverişin Merkezi"
  const ogImage = "/Logo.png"
  const canonical = `${baseUrl}/${locale}`

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-video-preview": -1,
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": baseUrl,
      },
    },
    openGraph: {
      title: `${title} | ${
        process.env.NEXT_PUBLIC_SITE_NAME ||
        "Kayı.com | Aradığın Her Şey Burada!"
      }`,
      description,
      url: canonical,
      siteName:
        process.env.NEXT_PUBLIC_SITE_NAME ||
        "Kayı.com | Aradığın Her Şey Burada!",
      type: "website",
      images: [
        {
          url: ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt:
            process.env.NEXT_PUBLIC_SITE_NAME ||
            "Kayı.com | Aradığın Her Şey Burada!",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`],
    },
  }
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = headersList.get("x-forwarded-proto") || "https"
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

  const siteName =
    process.env.NEXT_PUBLIC_SITE_NAME ||
    "Kayı.com | Aradığın Her Şey Burada!"

  return (
    <main className="flex flex-col gap-4 row-start-2 items-center sm:items-start text-primary">
      {/* Organization JSON-LD */}
      <Script
        id="ld-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteName,
            url: `${baseUrl}/${locale}`,
            logo: `${baseUrl}/favicon.ico`,
          }),
        }}
      />
      {/* WebSite JSON-LD */}
      <Script
        id="ld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteName,
            url: `${baseUrl}/${locale}`,
            inLanguage: toHreflang(locale),
          }),
        }}
      />

      <HeroSlider />
      <div className="px-4 lg:px-6 w-full">
        <HomeCategories />
      </div>
      <div className="px-4 lg:px-6 w-full">
        <HomeProductSection heading="Yeni Gelen Ürünler" locale={locale} home />
      </div>
      <div className="px-4 lg:px-6 w-full">
        <Suspense fallback={<CollectionSliderSkeleton />}>
          <CollectionProductSection
            heading="Flaş İndirimler"
            collectionHandle="flash-sales"
            locale={locale}
            allProductsHref="/collections/flash-sales"
            limit={12}
            shuffle
            revalidateSeconds={120}
          />
        </Suspense>
      </div>
      <div className="px-4 lg:px-6 w-full">
        <Suspense fallback={<CollectionSliderSkeleton />}>
          <CollectionProductSection
            heading="Günün Teklifleri"
            collectionHandle="daily-deals"
            locale={locale}
            allProductsHref="/collections/daily-deals"
            limit={12}
            shuffle
            revalidateSeconds={120}
          />
        </Suspense>
      </div>
      <BlogSection />
    </main>
  )
}
