import { Response, NextFunction } from "express"
import { AuthRequest, resolveIdentity } from "./auth"
import prisma from "../lib/prisma"

/**
 * Express middleware that verifies the authenticated user is a participant
 * of the conversation specified by `req.params.conversationId` (or falls
 * back to the root `req.params.id`).
 *
 * Must be placed after `authMiddleware` so `req.auth` is populated.
 * Attaches `req.conversationId` and `req.participantUserId` for downstream handlers.
 *
 * Responds with 403 when the user is not a participant.
 */
export async function requireConversationParticipant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = resolveIdentity(req.auth!)
    // params.id covers /:id/messages style routes; params.conversationId covers explicit param;
    // body.conversationId covers upload which passes it as a form field
    const conversationId = (
      req.params.conversationId ??
      req.params.id ??
      (req.body as any)?.conversationId
    ) as string | undefined

    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" })
      return
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })

    if (!participant) {
      res.status(403).json({ error: "Not a participant of this conversation" })
      return
    }

    // Attach for convenient access in handlers
    ;(req as any).conversationId = conversationId
    ;(req as any).participantUserId = userId

    next()
  } catch (err) {
    next(err)
  }
}
