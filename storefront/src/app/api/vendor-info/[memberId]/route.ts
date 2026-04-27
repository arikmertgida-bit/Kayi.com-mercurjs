import { NextResponse } from "next/server"

/**
 * GET /api/vendor-info/[memberId]
 *
 * Returns seller store info (id, name, handle, photo) for a given member ID.
 * Used by MessengerInbox to build VENDOR context cards and clickable store links.
 * Proxies to /store/sellers/member/{memberId} which now returns enriched seller data.
 */
export async function GET(
  _req: Request,
  { params }: { params: { memberId: string } }
) {
  const { memberId } = params

  if (!memberId) {
    return NextResponse.json({ id: null, name: null, handle: null, photo: null }, { status: 400 })
  }

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  try {
    const endpoint = memberId.startsWith("sel_")
      ? `${backendUrl}/store/sellers/${encodeURIComponent(memberId)}/avatar`
      : `${backendUrl}/store/sellers/member/${encodeURIComponent(memberId)}`

    const res = await fetch(endpoint, {
      headers: { "x-publishable-api-key": publishableKey },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ id: null, name: null, handle: null, photo: null }, { status: res.status })
    }

    const data = await res.json()

    // photo: member profile photo (avatarUrl), storePhoto: mağaza logosu
    return NextResponse.json({
      id: data.sellerId ?? null,
      name: data.sellerName ?? data.displayName ?? null,
      handle: data.sellerHandle ?? null,
      photo: data.avatarUrl ?? null, // member profile photo
      storePhoto: data.sellerPhoto ?? null, // mağaza logosu
    })
  } catch {
    return NextResponse.json({ id: null, name: null, handle: null, photo: null }, { status: 500 })
  }
}
