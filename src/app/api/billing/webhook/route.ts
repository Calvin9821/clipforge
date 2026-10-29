import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { recordWebhookOnce, activateSubscriptionForOrder } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const provider = req.headers.get("x-billing-provider") || "unknown";
  const eventId = req.headers.get("x-billing-event-id");
  if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  const raw = await req.text();
  const signature = req.headers.get("x-billing-signature") || "";
  const secret = process.env.CLIPFORGE_BILLING_WEBHOOK_SECRET;
  const testMode = process.env.CLIPFORGE_BILLING_TEST_MODE === "true";
  if (!testMode) {
    if (!secret || !signature) return NextResponse.json({ error: "Webhook verification is not configured" }, { status: 503 });
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(signature); const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  } else if (signature !== "test") {
    return NextResponse.json({ error: "Invalid test webhook signature" }, { status: 401 });
  }
  const body = JSON.parse(raw) as { type?: string; orderId?: string; providerOrderId?: string; payload?: Record<string, unknown> };
  if (!(await recordWebhookOnce(eventId, provider, body?.type ?? "unknown"))) return NextResponse.json({ ok: true, duplicate: true });
  if (body?.type === "payment.succeeded" && body.orderId && body.providerOrderId) await activateSubscriptionForOrder(body.orderId, body.providerOrderId, body.payload ?? {});
  return NextResponse.json({ ok: true });
}
