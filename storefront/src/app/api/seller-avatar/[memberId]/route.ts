import { NextResponse } from "next/server"

/**
 * GET /api/seller-avatar/[memberId]
 *
 * Next.js server-side proxy for fetching seller avatar info.
 * Proxies to the backend using the server-side MEDUSA_BACKEND_URL
 * so the client does not need direct backend access.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params

  if (!memberId) {
    return NextResponse.json({ avatarUrl: null, displayName: null })
  }

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  try {
    // Try member lookup first (mem_ prefix)
    const endpoint = memberId.startsWith("sel_")
      ? `${backendUrl}/store/sellers/${encodeURIComponent(memberId)}/avatar`
      : `${backendUrl}/store/sellers/member/${encodeURIComponent(memberId)}`

    const res = await fetch(endpoint, {
      headers: { "x-publishable-api-key": publishableKey },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ avatarUrl: null, displayName: null })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ avatarUrl: null, displayName: null })
  }
}
