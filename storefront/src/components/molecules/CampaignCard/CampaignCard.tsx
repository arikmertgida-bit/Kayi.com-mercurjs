import { Campaign } from "@/lib/data/campaigns"
import { CampaignCountdown } from "@/components/molecules/CampaignCountdown/CampaignCountdown"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

interface Props {
  campaign: Campaign
  status: "active" | "upcoming"
}

export function CampaignCard({ campaign, status }: Props) {
  const href = status === "active"
    ? `/campaigns/active/${campaign.id}`
    : `/campaigns/upcoming/${campaign.id}`

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Countdown banner */}
      <div className="p-3">
        <CampaignCountdown
          endsAt={campaign.ends_at}
          startsAt={campaign.starts_at}
          variant="full"
        />
      </div>

      <div className="px-4 pb-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">
          {campaign.name}
        </h3>

        {campaign.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {campaign.description}
          </p>
        )}

        {campaign.budget && campaign.budget.limit && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Kampanya Bütçesi</span>
              <span>
                {campaign.budget.used} / {campaign.budget.limit} kullanıldı
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  campaign.budget.used / campaign.budget.limit > 0.8
                    ? "bg-[#e30a17]"
                    : campaign.budget.used / campaign.budget.limit > 0.5
                    ? "bg-orange-400"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(100, (campaign.budget.used / campaign.budget.limit) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <LocalizedClientLink
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#e30a17] hover:underline"
        >
          Ürünleri Gör →
        </LocalizedClientLink>
      </div>
    </div>
  )
}
