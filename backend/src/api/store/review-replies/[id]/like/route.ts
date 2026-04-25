import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const { id: replyId } = req.params

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()

    const selectResult = await client.query(
      "SELECT id, liked_by_ids, likes_count FROM review_reply WHERE id = $1 AND deleted_at IS NULL",
      [replyId]
    )

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: "Reply not found" })
    }

    const row = selectResult.rows[0]
    const likedByIds: string[] = Array.isArray(row.liked_by_ids) ? row.liked_by_ids : []
    const alreadyLiked = likedByIds.includes(customerId)

    const newLikedByIds = alreadyLiked
      ? likedByIds.filter((id) => id !== customerId)
      : [...likedByIds, customerId]

    const likes_count = newLikedByIds.length

    await client.query(
      "UPDATE review_reply SET liked_by_ids = $1::jsonb, likes_count = $2, updated_at = now() WHERE id = $3",
      [JSON.stringify(newLikedByIds), likes_count, replyId]
    )

    return res.json({ liked: !alreadyLiked, likes_count })
  } finally {
    await client.end()
  }
}

