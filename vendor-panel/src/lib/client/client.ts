import Medusa, { FetchError } from "@medusajs/js-sdk"
import qs from "qs"

import { mapBackendErrorMessage, mapUnknownBackendError } from "../backend-error-mapper"

export const backendUrl = __BACKEND_URL__ ?? "/"
export const publishableApiKey = __PUBLISHABLE_API_KEY__ ?? ""

export const sdk = new Medusa({
  baseUrl: backendUrl,
  publishableKey: publishableApiKey,
})

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
  window.__sdk = sdk
}

export const importProductsQuery = async (file: File) => {
  const formData = new FormData()
  formData.append("file", file)
  const token = window.localStorage.getItem("medusa_auth_token") || ""

  return await fetch(`${backendUrl}/vendor/products/import`, {
    method: "POST",
    body: formData,
    headers: {
      authorization: `Bearer ${token}`,
      "x-publishable-api-key": publishableApiKey,
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        let message = "An unexpected error occurred"
        try {
          const errorData: unknown = await res.json()
          message = mapUnknownBackendError(errorData, message)
        } catch {
          // Response body was not JSON
        }
        throw new Error(message)
      }
      return res.json()
    })
    .catch((err: unknown) => {
      throw err
    })
}

export const uploadFilesQuery = async (files: { file?: File | null }[]) => {
  const formData = new FormData()
  const token = window.localStorage.getItem("medusa_auth_token") || ""

  for (const item of files) {
    if (!item.file) {
      throw new Error("Yuklenecek dosya bulunamadi")
    }
    formData.append("files", item.file)
  }

  const response = await fetch(`${backendUrl}/vendor/uploads`, {
    method: "POST",
    body: formData,
    headers: {
      authorization: `Bearer ${token}`,
      "x-publishable-api-key": publishableApiKey,
    },
  })

  if (!response.ok) {
    let message = "Dosya yukleme basarisiz oldu"
    try {
      const errorData: unknown = await response.json()
      message = mapUnknownBackendError(errorData, message)
    } catch {
      // Response body was not JSON
    }
    throw new Error(message)
  }

  return response.json() as Promise<{ files: { id: string; url: string }[] }>
}

export const fetchQuery = async <T = any>(
  url: string,
  {
    method,
    body,
    query,
    headers,
  }: {
    method: "GET" | "POST" | "DELETE" | "PUT"
    body?: object
    query?: Record<string, any>
    headers?: { [key: string]: string }
  }
): Promise<T> => {
  const bearer = window.localStorage.getItem("medusa_auth_token") || ""
  const cleanQuery: Record<string, any> = {}
  for (const [k, v] of Object.entries(query || {})) {
    if (v === null || v === undefined || v === "") continue
    if (Array.isArray(v) && v.length === 0) continue
    cleanQuery[k] = v
  }
  const params = qs.stringify(cleanQuery, { skipNulls: true })
  const response = await fetch(`${backendUrl}${url}${params ? `?${params}` : ""}`, {
    method: method,
    headers: {
      authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      "x-publishable-api-key": publishableApiKey,
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
  })

  if (!response.ok) {
    let message = "An unexpected error occurred"
    try {
      const errorData: unknown = await response.json()
      message = mapUnknownBackendError(errorData, message)
    } catch {
      // Response body was not JSON (e.g. HTML error page from proxy)
    }
    throw new FetchError(message, response.statusText, response.status)
  }

  return response.json()
}
