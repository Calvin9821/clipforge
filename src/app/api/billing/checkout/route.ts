import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPendingOrder, type PlanId } from "@/lib/billing";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(req, "请先登录", "Please sign in first", 401);
  const body = await req.json().catch(() => null) as { planId?: PlanId; region?: "cn" | "intl" } | null;
  if (!body?.planId || !["merchant", "pro", "team"].includes(body.planId)) return apiError(req, "套餐无效", "Invalid paid plan", 400);
  const provider = body.region === "cn" ? "cn_pending_provider" : "stripe_pending_provider";
  const currency = body.region === "cn" ? "CNY" : "USD";
  const { order, plan } = await createPendingOrder(user.id, body.planId, provider, currency);
  return NextResponse.json({ orderId: order.id, provider, plan, checkoutUrl: null, configured: false }, { status: 202 });
}
