import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get("_medusa_jwt")?.value ||
    cookieStore.get("_session")?.value ||
    ""

  const formData = await request.formData()

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  const response = await fetch(`${backendUrl}/store/customer/upload`, {
    method: "POST",
    headers: {
      Authorization: authToken ? `Bearer ${authToken}` : "",
      "x-publishable-api-key": publishableKey,
    },
    body: formData,
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Upload failed" }, { status: response.status })
  }

  const data = await response.json()
  // Normalize: return { url } from first file
  const file = data?.files?.[0]
  if (!file?.url) {
    return NextResponse.json({ error: "No URL returned" }, { status: 500 })
  }

  return NextResponse.json({ url: file.url })
}
