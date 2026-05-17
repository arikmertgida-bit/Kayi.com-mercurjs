import Medusa, { FetchError } from "@medusajs/js-sdk";

import { mapBackendErrorMessage, mapUnknownBackendError } from "../backend-error-mapper";

export const backendUrl = __BACKEND_URL__ ?? "/";

export const sdk = new Medusa({
  baseUrl: backendUrl,
});

type FetchClient = {
  fetch: (...args: unknown[]) => Promise<unknown>
}

const isFetchClient = (value: unknown): value is FetchClient => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as { fetch?: unknown }
  return typeof candidate.fetch === "function"
}

const normalizeFetchError = (error: unknown): never => {
  const fallbackMessage = error instanceof Error ? error.message : mapBackendErrorMessage("An unknown error occurred")
  const mappedMessage = mapUnknownBackendError(error, fallbackMessage)

  if (error instanceof FetchError) {
    throw new FetchError(mappedMessage, error.statusText, error.status)
  }

  if (error instanceof Error) {
    throw new Error(mappedMessage)
  }

  throw error
}

if (isFetchClient(sdk.client)) {
  const originalFetch = sdk.client.fetch.bind(sdk.client) as (
    input: string | URL | Request,
    init?: unknown
  ) => Promise<unknown>

  const wrappedFetch = (async <T>(input: string | URL | Request, init?: unknown): Promise<T> => {
    try {
      return (await originalFetch(input, init)) as T
    } catch (error) {
      return normalizeFetchError(error)
    }
  }) as typeof sdk.client.fetch

  sdk.client.fetch = wrappedFetch
}

// useful when you want to call the BE from the console and try things out quickly
declare global {
  interface Window { __sdk: typeof sdk }
}
if (typeof window !== "undefined") {
  window.__sdk = sdk;
}
