"use server"

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

function getHeaders() {
  return {
    "Content-Type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
  }
}

export interface CampaignBudget {
  id: string
  type: string
  limit: number | null
  used: number
  currency_code: string | null
}

export interface Campaign {
  id: string
  name: string
  description: string | null
  campaign_identifier: string
  starts_at: string | null
  ends_at: string | null
  budget: CampaignBudget | null
}

export interface CampaignsResponse {
  campaigns: Campaign[]
  count: number
  limit: number
  offset: number
}

export async function getCampaigns(
  status: "active" | "upcoming",
  limit = 24,
  offset = 0
): Promise<CampaignsResponse> {
  try {
    const params = new URLSearchParams({
      status,
      limit: String(limit),
      offset: String(offset),
    })

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/campaigns?${params}`,
      {
        next: { revalidate: 30 },
        headers: getHeaders(),
      }
    )

    if (!res.ok) return { campaigns: [], count: 0, limit, offset }

    return (await res.json()) as CampaignsResponse
  } catch {
    return { campaigns: [], count: 0, limit, offset }
  }
}
