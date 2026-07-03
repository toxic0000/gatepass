import { createHmac, scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? "dev-admin-secret-change-in-prod";

export const ADMIN_COOKIE = "admin_session";

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

export function createSessionToken(adminId: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ adminId, exp })).toString(
    "base64url"
  );
  const sig = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string
): { adminId: string } | null {
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
    return { adminId: data.adminId };
  } catch {
    return null;
  }
}
