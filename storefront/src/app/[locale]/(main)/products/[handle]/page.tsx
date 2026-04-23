import { ProductDetailsPage } from "@/components/sections"
import { listProducts } from "@/lib/data/products"
import { generateProductMetadata } from "@/lib/helpers/seo"
import type { Metadata } from "next"
import { cookies } from "next/headers"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params

  const prod = await listProducts({
    countryCode: locale,
    queryParams: { handle: [handle], limit: 1 },
    forceCache: true,
  }).then(({ response }) => response.products[0])

  return generateProductMetadata(prod)
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params
  const cookieStore = await cookies()
  const serverVerified = cookieStore.get("kayi_age_verified")?.value === "1"

  return (
    <main className="container">
      <ProductDetailsPage handle={handle} locale={locale} serverVerified={serverVerified} />
    </main>
  )
}
