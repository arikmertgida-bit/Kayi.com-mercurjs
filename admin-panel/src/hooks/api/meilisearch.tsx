import { sdk } from "@lib/client";
import { queryKeysFactory } from "@lib/query-key-factory";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { MeilisearchStatus } from "@custom-types/meilisearch";

export const meilisearchQueryKeys = queryKeysFactory("meilisearch");

export const useSyncMeilisearch = () => {
  return useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/meilisearch", {
        method: "POST",
      }),
  });
};

export const useMeilisearch = () => {
  return useQuery<MeilisearchStatus>({
    queryKey: ["meilisearch"],
    queryFn: () => sdk.client.fetch("/admin/meilisearch", { method: "GET" }),
  });
};
