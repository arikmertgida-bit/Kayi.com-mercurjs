import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export interface AuthPayload {
  sub: string          // Medusa customer_id or seller_id
  actor_id?: string    // vendor actor id
  actor_type?: string  // "seller" | "user" | "admin"
}

export interface AuthRequest extends Request {
  auth?: AuthPayload
}

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error("[auth] JWT_SECRET environment variable is not set")
}

/**
 * Verifies the Bearer token issued by Medusa.
 * Attaches decoded payload to req.auth.
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" })
    return
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.auth = payload
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

/**
 * Decodes a JWT string without verifying (used in Socket.io handshake
 * where we verify separately).
 */
export function decodeToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

/**
 * Resolves a canonical userId and userType from the Medusa JWT payload.
 * Medusa v2 JWTs use "sub" for the actor id.
 */
export function resolveIdentity(payload: AuthPayload): {
  userId: string
  userType: "CUSTOMER" | "SELLER" | "ADMIN"
} {
  const actorType = payload.actor_type

  if (actorType === "seller") {
    return { userId: payload.actor_id ?? payload.sub, userType: "SELLER" }
  }

  if (actorType === "admin" || actorType === "user") {
    return { userId: payload.actor_id ?? payload.sub, userType: "ADMIN" }
  }

  // Default: customer
  return { userId: payload.actor_id ?? payload.sub, userType: "CUSTOMER" }
}
