import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, UseQueryOptions, useQuery } from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const FOLLOWERS_QUERY_KEY = "followers" as const
export const followersQueryKeys = {
  ...queryKeysFactory(FOLLOWERS_QUERY_KEY),
  list: (query?: Record<string, unknown>) => [FOLLOWERS_QUERY_KEY, "list", query],
}

export type Follower = {
  customer_id: string
  name: string | null
  email: string
  order_count: number
  followed_at: string
}

export type FollowersResponse = {
  followers: Follower[]
  count: number
  offset: number
  limit: number
}

export const useFollowers = (
  query?: { offset?: number; limit?: number },
  options?: UseQueryOptions<FollowersResponse, FetchError, FollowersResponse, QueryKey>
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      fetchQuery("/vendor/followers", {
        method: "GET",
        query: {
          offset: query?.offset ?? 0,
          limit: query?.limit ?? 20,
        },
      }) as Promise<FollowersResponse>,
    queryKey: followersQueryKeys.list(query),
    ...options,
  })

  return {
    followers: data?.followers ?? [],
    count: data?.count ?? 0,
    offset: data?.offset ?? 0,
    limit: data?.limit ?? 20,
    ...rest,
  }
}
