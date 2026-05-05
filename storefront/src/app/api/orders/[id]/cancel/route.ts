import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"

/**
 * POST /api/orders/[id]/cancel
 * Proxies the cancel request to the Medusa backend store route.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const cookieStore = await cookies()
  const authToken = cookieStore.get("_medusa_jwt")?.value

  if (!authToken) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 })
  }

  const response = await fetch(`${BACKEND_URL}/store/orders/${id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json(
      { message: data?.message ?? "Failed to cancel order." },
      { status: response.status }
    )
  }

  return NextResponse.json(data, { status: 200 })
}
