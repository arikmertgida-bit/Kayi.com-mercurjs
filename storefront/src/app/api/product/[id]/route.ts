import { NextResponse } from "next/server"

/**
 * GET /api/product/[id]
 *
 * Next.js server-side proxy for fetching a single product by ID.
 * Proxies to the backend using the server-side MEDUSA_BACKEND_URL
 * so the client does not need direct backend access.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ product: null }, { status: 400 })
  }

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  try {
    const res = await fetch(`${backendUrl}/store/products/${encodeURIComponent(id)}`, {
      headers: { "x-publishable-api-key": publishableKey },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({ product: null }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ product: null }, { status: 500 })
  }
}
