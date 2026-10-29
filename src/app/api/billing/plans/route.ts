import { NextResponse } from "next/server";
import { listPlans } from "@/lib/billing";
export async function GET() { return NextResponse.json({ plans: await listPlans() }); }
