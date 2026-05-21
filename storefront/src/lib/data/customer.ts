"use server"

import { sdk } from "../config"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders,+metadata",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch((err: unknown) => {
      throw new Error(err instanceof Error ? err.message : String(err))
    })

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export async function signup(formData: FormData) {
  const password = (formData.get("password") as string | null) ?? ""
  const customerForm = {
    email: (formData.get("email") as string | null) ?? "",
    first_name: (formData.get("first_name") as string | null) ?? "",
    last_name: (formData.get("last_name") as string | null) ?? "",
    phone: (formData.get("phone") as string | null) ?? "",
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()

    return createdCustomer
  } catch (error: unknown) {
    const msg: string = (error instanceof Error ? error.message : String(error)).toLowerCase()
    if (msg.includes("already") || msg.includes("exists")) {
      return "Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın."
    }
    return "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin."
  }
}

export async function login(formData: FormData) {
  const email = (formData.get("email") as string | null) ?? ""
  const password = (formData.get("password") as string | null) ?? ""

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error: unknown) {
    return "Geçersiz e-posta veya şifre. Lütfen tekrar deneyin."
  }

  try {
    await transferCart()
  } catch (error: unknown) {
    return "Giriş yapıldı ancak sepet aktarılamadı. Lütfen tekrar deneyin."
  }
}

export async function signout() {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
  redirect(`/`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (formData: FormData): Promise<{ success: boolean; error: string | null }> => {
  const address = {
    address_name: (formData.get("address_name") as string | null) ?? "",
    first_name: (formData.get("first_name") as string | null) ?? "",
    last_name: (formData.get("last_name") as string | null) ?? "",
    company: (formData.get("company") as string | null) ?? "",
    address_1: (formData.get("address_1") as string | null) ?? "",
    city: (formData.get("city") as string | null) ?? "",
    postal_code: (formData.get("postal_code") as string | null) ?? "",
    country_code: (formData.get("country_code") as string | null) ?? "",
    phone: (formData.get("phone") as string | null) ?? "",
    province: (formData.get("province") as string | null) ?? "",
    is_default_billing: Boolean(formData.get("isDefaultBilling")),
    is_default_shipping: Boolean(formData.get("isDefaultShipping")),
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async ({ customer }) => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId = (formData.get("addressId") as string | null) ?? ""

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    address_name: (formData.get("address_name") as string | null) ?? "",
    first_name: (formData.get("first_name") as string | null) ?? "",
    last_name: (formData.get("last_name") as string | null) ?? "",
    company: (formData.get("company") as string | null) ?? "",
    address_1: (formData.get("address_1") as string | null) ?? "",
    address_2: (formData.get("address_2") as string | null) ?? "",
    city: (formData.get("city") as string | null) ?? "",
    postal_code: (formData.get("postal_code") as string | null) ?? "",
    province: (formData.get("province") as string | null) ?? "",
    country_code: (formData.get("country_code") as string | null) ?? "",
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = (formData.get("phone") as string | null) ?? ""

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerPassword = async (
  password: string,
  token: string
): Promise<{ success: boolean; error: string | null }> => {
  const res = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/auth/customer/emailpass/update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    }
  )
    .then(async () => {
      await removeAuthToken()
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err: unknown) => {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    })

  return res
}

export const sendResetPasswordEmail = async (email: string) => {
  const res = await sdk.auth
    .resetPassword("customer", "emailpass", {
      identifier: email,
    })
    .then(() => {
      return { success: true, error: null }
    })
    .catch((err: unknown) => {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    })

  return res
}

export const uploadCustomerFile = async (
  formData: FormData,
  imageType?: "avatar" | "cover"
): Promise<string | null> => {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return null

  const BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  const res = await fetch(`${BACKEND_URL}/store/customer/upload`, {
    method: "POST",
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(authHeaders as Record<string, string>),
      ...(imageType ? { "x-image-type": imageType } : {}),
    },
    body: formData,
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.files?.[0]?.url ?? null
}

export const updateCustomerPhoto = async (
  type: "avatar" | "cover",
  url: string
) => {
  const existing = await retrieveCustomer()
  const meta: Record<string, unknown> = (existing?.metadata as Record<string, unknown>) ?? {}

  return updateCustomer({
    metadata: {
      ...meta,
      ...(type === "avatar" ? { avatar_url: url } : { cover_url: url }),
    },
  })
}

export const updateNotificationPreference = async (
  enabled: boolean
): Promise<void> => {
  const existing = await retrieveCustomer()
  const meta: Record<string, unknown> = (existing?.metadata as Record<string, unknown>) ?? {}

  await updateCustomer({
    metadata: {
      ...meta,
      notify_on_review_reply: enabled,
    },
  })
}

export const updateGlobalNotificationPreference = async (
  enabled: boolean
): Promise<void> => {
  const existing = await retrieveCustomer()
  const meta: Record<string, unknown> = (existing?.metadata as Record<string, unknown>) ?? {}

  await updateCustomer({
    metadata: {
      ...meta,
      notify_enabled: enabled,
    },
  })
}

