import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const cookieStore = await cookies()
  const authToken =
    cookieStore.get("_medusa_jwt")?.value ||
    cookieStore.get("_session")?.value ||
    ""

  if (!authToken) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 }
    )
  }

  const body = await request.json()

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  const response = await fetch(
    `${backendUrl}/store/product-reports/${id}/report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        "x-publishable-api-key": publishableKey,
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.status })
}
