import { NextRequest, NextResponse } from "next/server";
import { adminUsers, requireAdmin } from "@/lib/admin";
export async function GET(req: NextRequest) { try { await requireAdmin(); return NextResponse.json({ users: await adminUsers(req.nextUrl.searchParams.get("search") ?? undefined) }); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); } }
