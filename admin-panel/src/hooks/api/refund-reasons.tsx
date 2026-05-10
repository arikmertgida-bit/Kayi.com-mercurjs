import { FetchError } from "@medusajs/js-sdk";
import type { HttpTypes } from "@medusajs/types";

import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import type {
  AdminCreateRefundReason,
  AdminRefundReasonListParams,
  AdminRefundReasonListResponse,
  AdminRefundReasonParams,
  AdminRefundReasonResponse,
  AdminUpdateRefundReason,
} from "@custom-types/refund-reasons";

import { sdk } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";

const REFUND_REASONS_QUERY_KEY = "refund_reasons" as const;
export const refundReasonsQueryKeys = queryKeysFactory(
  REFUND_REASONS_QUERY_KEY,
);

export const useRefundReasons = (
  query?: AdminRefundReasonListParams,
  options?: Omit<
    UseQueryOptions<
      AdminRefundReasonListResponse,
      FetchError,
      AdminRefundReasonListResponse
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.admin.refundReason.list(
        query,
      ) as Promise<AdminRefundReasonListResponse>,
    queryKey: refundReasonsQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useRefundReason = (
  id: string,
  query?: AdminRefundReasonParams,
  options?: Omit<
    UseQueryOptions<
      AdminRefundReasonResponse,
      FetchError,
      AdminRefundReasonResponse
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.admin.refundReason.retrieve(
        id,
        query,
      ) as Promise<AdminRefundReasonResponse>,
    queryKey: refundReasonsQueryKeys.detail(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateRefundReason = (
  query?: AdminRefundReasonParams,
  options?: UseMutationOptions<
    AdminRefundReasonResponse,
    FetchError,
    AdminCreateRefundReason
  >,
) => {
  return useMutation({
    mutationFn: async (data) =>
      sdk.admin.refundReason.create(
        data,
        query,
      ) as Promise<AdminRefundReasonResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: refundReasonsQueryKeys.lists(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateRefundReason = (
  id: string,
  options?: UseMutationOptions<
    AdminRefundReasonResponse,
    FetchError,
    AdminUpdateRefundReason
  >,
) => {
  return useMutation({
    mutationFn: async (data) =>
      sdk.admin.refundReason.update(
        id,
        data,
      ) as Promise<AdminRefundReasonResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: refundReasonsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: refundReasonsQueryKeys.detail(data.refund_reason.id),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteRefundReasonLazy = (
  options?: UseMutationOptions<
    HttpTypes.AdminRefundReasonDeleteResponse,
    FetchError,
    string
  >,
) => {
  return useMutation({
    mutationFn: (id: string) =>
      sdk.admin.refundReason.delete(id) as Promise<HttpTypes.AdminRefundReasonDeleteResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: refundReasonsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: refundReasonsQueryKeys.details(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
