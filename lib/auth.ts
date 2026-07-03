import { createHmac, scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { NextRequest } from "next/server";
import type { Community, Role, User } from "@prisma/client";
import { db } from "@/lib/db";

const scryptAsync = promisify(scrypt);
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-session-secret-change-in-prod";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

export type SessionUser = User & { community: Community | null };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const [hashed, salt] = hash.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex") === hashed;
}

export function createSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString(
    "base64url"
  );
  const sig = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const dot = token.lastIndexOf(".");
    const payload = token.substring(0, dot);
    const sig = token.substring(dot + 1);
    const expectedSig = createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

// Role and community status are read from the DB on every request (not from the
// token), so disabling a user or community takes effect immediately.
export async function getSessionUser(
  req: NextRequest
): Promise<SessionUser | null> {
  const session = verifySessionToken(
    req.cookies.get(SESSION_COOKIE)?.value ?? ""
  );
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { community: true },
  });
  if (!user) return null;
  if (user.community && !user.community.isActive) return null;
  return user;
}

export async function requireRole(
  req: NextRequest,
  ...roles: Role[]
): Promise<SessionUser | null> {
  const user = await getSessionUser(req);
  if (!user || !roles.includes(user.role)) return null;
  return user;
}
