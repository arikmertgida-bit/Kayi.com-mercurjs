import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { campaignsQueryKeys } from "./campaigns"

// ─── Pending Promotion types ──────────────────────────────────────────────────

export interface PendingPromotionRuleValue {
  id?: string
  value: string
}

export interface PendingPromotionRule {
  id?: string
  attribute: string
  operator: string
  values?: PendingPromotionRuleValue[]
}

export interface PendingPromotionApplicationMethod {
  type: string
  value: number | string | null
  target_rules?: PendingPromotionRule[]
}

export interface PendingPromotionMetadata {
  seller_id?: string
  approval_status?: string
  promotion_scope?: string
  financed_by?: string
}

export interface PendingPromotion {
  id: string
  code: string
  type: string
  status: string
  seller_id: string | null
  approval_status: string
  metadata: PendingPromotionMetadata | null
  application_method: PendingPromotionApplicationMethod | null
}

export interface PendingPromotionsResponse {
  promotions: PendingPromotion[]
  count: number
  limit: number
  offset: number
}

export const pendingPromotionsQueryKeys = queryKeysFactory("pending-promotions")

const PROMOTIONS_QUERY_KEY = "promotions" as const
export const promotionsQueryKeys = {
  ...queryKeysFactory(PROMOTIONS_QUERY_KEY),
  // TODO: handle invalidations properly
  listRules: (
    id: string | null,
    ruleType: string,
    query?: HttpTypes.AdminGetPromotionRuleParams
  ) => [PROMOTIONS_QUERY_KEY, id, ruleType, query],
  listRuleAttributes: (
    ruleType: string,
    promotionType?: string,
    applicationMethodTargetType?: string
  ) => [
    PROMOTIONS_QUERY_KEY,
    ruleType,
    promotionType,
    applicationMethodTargetType,
  ],
  listRuleValues: (
    ruleType: string,
    ruleValue: string,
    query: HttpTypes.AdminGetPromotionsRuleValueParams
  ) => [PROMOTIONS_QUERY_KEY, ruleType, ruleValue, query],
}

export const usePromotion = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionResponse,
      FetchError,
      HttpTypes.AdminPromotionResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.detail(id),
    queryFn: async () => sdk.admin.promotion.retrieve(id),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRules = (
  id: string | null,
  ruleType: string,
  query?: HttpTypes.AdminGetPromotionRuleParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionRuleListResponse,
      FetchError,
      HttpTypes.AdminPromotionRuleListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRules(id, ruleType, query),
    queryFn: async () => sdk.admin.promotion.listRules(id!, ruleType, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotions = (
  query?: HttpTypes.AdminGetPromotionsParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionListResponse,
      FetchError,
      HttpTypes.AdminPromotionListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.list(query),
    queryFn: async () => sdk.admin.promotion.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleAttributes = (
  ruleType: string,
  promotionType?: string,
  applicationMethodTargetType?: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      FetchError,
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleAttributes(
      ruleType,
      promotionType,
      applicationMethodTargetType
    ),
    queryFn: async () =>
      sdk.admin.promotion.listRuleAttributes(
        ruleType,
        promotionType,
        applicationMethodTargetType
      ),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleValues = (
  ruleType: string,
  ruleValue: string,
  query?: HttpTypes.AdminGetPromotionsRuleValueParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleValueOptionsListResponse,
      FetchError,
      HttpTypes.AdminRuleValueOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleValues(
      ruleType,
      ruleValue,
      query || {}
    ),
    queryFn: async () =>
      sdk.admin.promotion.listRuleValues(ruleType, ruleValue, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useDeletePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.DeleteResponse<"promotion">,
    FetchError,
    void
  >
) => {
  return useMutation({
    mutationFn: () => sdk.admin.promotion.delete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: promotionsQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreatePromotion = (
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.AdminCreatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotion.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campaignsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdatePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.AdminUpdatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotion.update(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionAddRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchAddPromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.addRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionRemoveRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchRemovePromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.removeRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionUpdateRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchUpdatePromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.updateRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// ─── Pending Promotion Approval Queue Hooks ───────────────────────────────────

export const usePendingPromotions = (
  query?: { limit?: number; offset?: number },
  options?: Omit<
    UseQueryOptions<
      Record<string, unknown>,
      Error,
      PendingPromotionsResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: pendingPromotionsQueryKeys.list(query),
    queryFn: () =>
      sdk.client.fetch<Record<string, unknown>>("/admin/pending-promotions", {
        method: "GET",
        query: { approval_status: "pending", ...query },
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useApprovePromotion = (
  options?: UseMutationOptions<
    { promotion: PendingPromotion },
    Error,
    { id: string; trust_level?: "standard" | "trusted" }
  >
) => {
  const qc = useQueryClient()
  const { onSuccess: callerOnSuccess, ...restOptions } = options ?? {}
  return useMutation({
    ...restOptions,
    mutationFn: ({ id, trust_level }) =>
      sdk.client.fetch<{ promotion: PendingPromotion }>(
        `/admin/promotions/${id}/approve`,
        {
          method: "POST",
          body: trust_level ? { trust_level } : {},
        }
      ),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: pendingPromotionsQueryKeys.lists() })
      callerOnSuccess?.(data, variables, context)
    },
  })
}

export const useRejectPromotion = (
  options?: UseMutationOptions<
    { promotion: PendingPromotion },
    Error,
    { id: string; reason: string }
  >
) => {
  const qc = useQueryClient()
  const { onSuccess: callerOnSuccess, ...restOptions } = options ?? {}
  return useMutation({
    ...restOptions,
    mutationFn: ({ id, reason }) =>
      sdk.client.fetch<{ promotion: PendingPromotion }>(
        `/admin/promotions/${id}/reject`,
        {
          method: "POST",
          body: { reason },
        }
      ),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: pendingPromotionsQueryKeys.lists() })
      callerOnSuccess?.(data, variables, context)
    },
  })
}
