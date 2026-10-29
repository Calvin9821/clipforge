import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { apiError } from "@/lib/api-error";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { email?: string; password?: string } | null;
  const user = (await db.select().from(users).where(eq(users.email, normalizeEmail(body?.email ?? ""))).limit(1))[0];
  if (!user || !body?.password || !verifyPassword(body.password, user.passwordHash)) return apiError(req, "邮箱或密码错误", "Invalid email or password", 401);
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
}
