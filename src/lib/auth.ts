import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users, workspaces, workspaceMembers } from "@/lib/db/schema";

const SESSION_COOKIE = "clipforge_session";
const SESSION_DAYS = 30;

function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const target = Buffer.from(expected, "hex");
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const id = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return token;
}

export async function createDefaultWorkspace(userId: string, email: string): Promise<string> {
  const workspace = (await db.insert(workspaces).values({ name: `${email.split("@")[0] ?? "我的"} 工作区`, ownerId: userId }).returning())[0];
  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: "owner" });
  return workspace.id;
}

export async function getDefaultWorkspace(userId: string) {
  const rows = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, createHash("sha256").update(token).digest("hex")));
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const rows = await db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.id, id), gt(sessions.expiresAt, now))).limit(1);
  return rows[0]?.user ?? null;
}

export { normalizeEmail };
