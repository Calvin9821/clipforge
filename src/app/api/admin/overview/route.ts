import { NextResponse } from "next/server";
import { adminOverview, requireAdmin } from "@/lib/admin";
export async function GET() { try { await requireAdmin(); return NextResponse.json(await adminOverview()); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); } }
