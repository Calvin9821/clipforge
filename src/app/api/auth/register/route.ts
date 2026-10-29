import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { apiError } from "@/lib/api-error";
import { createDefaultWorkspace, createSession, hashPassword, normalizeEmail } from "@/lib/auth";
import { ensureFreeSubscription, grantCredits } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = normalizeEmail(body?.email ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || (body?.password?.length ?? 0) < 8) return apiError(req, "请输入有效邮箱和至少 8 位密码", "Enter a valid email and an 8+ character password", 400);
  if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)).length) return apiError(req, "邮箱已注册", "Email is already registered", 409);
  const user = (await db.insert(users).values({ email, passwordHash: hashPassword(body!.password!) }).returning())[0];
  await createDefaultWorkspace(user.id, user.email);
  await ensureFreeSubscription(user.id);
  await grantCredits(user.id, 5, "signup:free");
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
}
