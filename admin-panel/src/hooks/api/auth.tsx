import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes } from "@medusajs/types"
import { UseMutationOptions, useMutation } from "@tanstack/react-query"

import {
  extractErrorMessage,
  mapBackendErrorMessage,
} from "../../lib/backend-error-mapper"
import { sdk } from "../../lib/client"

type FetchErrorLike = {
  status?: number
  statusText?: string
}

const toMappedFetchError = (error: unknown, fallbackMessage: string): FetchError => {
  const extractedMessage = extractErrorMessage(error)
  const mappedMessage = mapBackendErrorMessage(extractedMessage ?? fallbackMessage)

  const fetchErrorLike = error as FetchErrorLike | null
  const status =
    typeof fetchErrorLike?.status === "number" ? fetchErrorLike.status : 0
  const statusText =
    typeof fetchErrorLike?.statusText === "string" && fetchErrorLike.statusText.trim().length > 0
      ? fetchErrorLike.statusText
      : "Error"

  return new FetchError(mappedMessage, statusText, status)
}

export const useSignInWithEmailPass = (
  options?: UseMutationOptions<
    | string
    | {
        location: string
      },
    FetchError,
    HttpTypes.AdminSignUpWithEmailPassword
  >
) => {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        return await sdk.auth.login("user", "emailpass", payload)
      } catch (error) {
        throw toMappedFetchError(error, "Invalid email or password")
      }
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useSignUpWithEmailPass = (
  options?: UseMutationOptions<
    string,
    FetchError,
    HttpTypes.AdminSignInWithEmailPassword
  >
) => {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        return await sdk.auth.register("user", "emailpass", payload)
      } catch (error) {
        throw toMappedFetchError(error, "An unknown error occurred")
      }
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useResetPasswordForEmailPass = (
  options?: UseMutationOptions<void, FetchError, { email: string }>
) => {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        return await sdk.auth.resetPassword("user", "emailpass", {
          identifier: payload.email,
        })
      } catch (error) {
        throw toMappedFetchError(error, "An unknown error occurred")
      }
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useLogout = (options?: UseMutationOptions<void, FetchError>) => {
  return useMutation({
    mutationFn: async () => {
      try {
        return await sdk.auth.logout()
      } catch (error) {
        throw toMappedFetchError(error, "An unknown error occurred")
      }
    },
    ...options,
  })
}

export const useUpdateProviderForEmailPass = (
  token: string,
  options?: UseMutationOptions<void, FetchError, HttpTypes.AdminUpdateProvider>
) => {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        return await sdk.auth.updateProvider("user", "emailpass", payload, token)
      } catch (error) {
        throw toMappedFetchError(error, "An unknown error occurred")
      }
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
