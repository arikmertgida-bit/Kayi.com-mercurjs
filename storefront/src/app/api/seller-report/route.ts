import { NextRequest, NextResponse } from "next/server"

const backendUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sellerId, reason, comment } = body as {
      sellerId?: string
      reason?: string
      comment?: string
    }

    if (!sellerId || !reason || !comment) {
      return NextResponse.json(
        { error: "Missing required fields: sellerId, reason, comment" },
        { status: 400 }
      )
    }

    const res = await fetch(
      `${backendUrl}/store/sellers/${encodeURIComponent(sellerId)}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, comment }),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string }
      return NextResponse.json(
        { error: err.message ?? "Failed to submit report" },
        { status: res.status }
      )
    }

    return NextResponse.json({ message: "Report submitted successfully" }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
