import { sdk } from "@lib/client";
import { queryKeysFactory } from "@lib/query-key-factory";
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { AdminRequest, AdminReviewRequest } from "@custom-types/requests";

export const requestsQueryKeys = queryKeysFactory("requests");

export const useVendorRequests = (
  query?: Record<string, string | number | undefined>,
  options?: Omit<
    UseQueryOptions<
      Record<string, string | number>,
      Error,
      {
        requests: AdminRequest[];
        count?: number;
      },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...other } = useQuery({
    queryKey: requestsQueryKeys.list(query),
    queryFn: () =>
      sdk.client.fetch<Record<string, string | number>>("/admin/requests", {
        method: "GET",
        query: { order: "-created_at", ...query },
      }),
    ...options,
  });

  return { ...data, ...other };
};

export const useVendorRequest = (
  id: string,
  options?: Omit<
    UseQueryOptions<unknown, Error, { request?: AdminRequest }, QueryKey>,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...other } = useQuery({
    queryKey: requestsQueryKeys.detail(id),
    queryFn: () =>
      sdk.client.fetch(`/admin/requests/${id}`, {
        method: "GET",
      }),
    ...options,
  });

  return { ...data, ...other };
};

export const useReviewRequest = (
  options: UseMutationOptions<
    { id?: string; status?: string },
    Error,
    { id: string; payload: AdminReviewRequest }
  >,
) => {
  return useMutation({
    mutationFn: ({ id, payload }) =>
      sdk.client.fetch(`/admin/requests/${id}`, {
        method: "POST",
        body: payload,
      }),
    ...options,
  });
};

export const useDeleteRequest = (
  options?: UseMutationOptions<unknown, Error, { id: string }>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      sdk.client.fetch(`/admin/requests/${id}`, {
        method: "DELETE",
      }),

    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: requestsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
