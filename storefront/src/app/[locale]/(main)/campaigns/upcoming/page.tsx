import { getCampaigns } from "@/lib/data/campaigns"
import { CampaignCard } from "@/components/molecules/CampaignCard/CampaignCard"
import { Breadcrumbs } from "@/components/atoms"
import { CampaignSidebar } from "@/components/molecules/CampaignSidebar/CampaignSidebar"
import { listMegaMenuCategories } from "@/lib/data/categories"
import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"

export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Çok Yakında | Kayı.com",
    description: "Çok yakında başlayacak kampanyalar ve indirimler — şimdiden takibe al!",
    robots: { index: true, follow: true },
  }
}

export default async function UpcomingCampaignsPage() {
  const t = await getTranslations("categories")
  const [{ campaigns }, megaMenuCategories] = await Promise.all([
    getCampaigns("upcoming", 24, 0),
    listMegaMenuCategories().catch(() => []),
  ])

  const breadcrumbItems = [
    { path: "/", label: "Ana Sayfa" },
    { path: "/campaigns/upcoming", label: t("upcoming") },
  ]

  return (
    <main className="container py-6">
      <div className="hidden md:block mb-2">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <div className="md:flex gap-4">
        {/* Sidebar — aynı kategoriler sayfasındaki yapı */}
        <div
          className="w-[280px] flex-shrink-0 hidden md:block"
          style={{ backgroundColor: "rgb(240, 225, 243)", borderRadius: "8px", padding: "8px" }}
        >
          <CampaignSidebar initialCategories={megaMenuCategories} />
        </div>

        {/* Sağ içerik */}
        <div className="w-full">
          {campaigns.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">⏳</p>
              <p className="font-semibold text-lg">Yakında başlayacak kampanya bulunmuyor.</p>
              <p className="text-sm mt-1">Yeni kampanyalar için bizi takip etmeye devam edin!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} status="upcoming" />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
