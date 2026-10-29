import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin, writeAudit } from "@/lib/admin";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const admin = await requireAdmin(); const { id } = await params; const body = await req.json() as { disabled?: boolean; reason?: string }; const before = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]; if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 }); const after = { disabled: body.disabled ?? before.disabled }; await db.update(users).set(after).where(eq(users.id, id)); await writeAudit({ actorUserId: admin.id, action: after.disabled ? "user.disable" : "user.enable", targetType: "user", targetId: id, before, after, reason: body.reason }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); } }
