"use server"
import { Wishlist } from "@/types/wishlist"
import { sdk } from "../config"
import { getAuthHeaders } from "./cookies"
import { revalidatePath } from "next/cache"

export const getUserWishlists = async () => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env
      .NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  return sdk.client
    .fetch<{ wishlists: Wishlist[]; count: number }>(`/store/wishlist`, {
      cache: "no-cache",
      headers,
      method: "GET",
    })
    .then((res) => {
      return res
    })
}

export const addWishlistItem = async ({
  reference_id,
  reference,
}: {
  reference_id: string
  reference: "product"
}) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env
      .NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  const response = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/wishlist`,
    {
      headers,
      method: "POST",
      body: JSON.stringify({
        reference,
        reference_id,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to add wishlist item: ${response.status} ${error}`)
  }

  revalidatePath("/user/wishlist")
}

export const removeWishlistItem = async ({
  wishlist_id,
  product_id,
}: {
  wishlist_id: string
  product_id: string
}) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env
      .NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  // b2c-core v1.5.3: DELETE /store/wishlist/product/{product_id}
  // (wishlist_id is resolved server-side from the authenticated customer)
  const response = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/wishlist/product/${product_id}`,
    {
      headers,
      method: "DELETE",
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to remove wishlist item: ${response.status} ${error}`)
  }

  revalidatePath("/user/wishlist")
}
