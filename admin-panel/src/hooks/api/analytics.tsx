import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

const ANALYTICS_QUERY_KEY = "admin-analytics" as const

export type DayCount = { date: string; count: number }

export type AdminAnalyticsData = {
  orders_by_day: DayCount[]
  customers_by_day: DayCount[]
  total_products: number
  active_sellers: number
  total_orders: number
  total_customers: number
}

/**
 * 24-hour cache: data is fetched once and stays fresh for 24 hours.
 * This prevents repeated API calls and keeps LCP/INP low.
 */
const STALE_24H = 24 * 60 * 60 * 1000

export const useAdminAnalytics = ({
  from,
  to,
}: {
  from: string
  to: string
}) => {
  const { data, ...rest } = useQuery<AdminAnalyticsData>({
    queryKey: [ANALYTICS_QUERY_KEY, from, to],
    queryFn: () =>
      sdk.client.fetch<AdminAnalyticsData>("/admin/analytics", {
        method: "GET",
        query: { from, to },
      }),
    staleTime: STALE_24H,
    gcTime: STALE_24H + 60 * 60 * 1000, // keep in cache slightly longer than stale
  })

  return { data, ...rest }
}
