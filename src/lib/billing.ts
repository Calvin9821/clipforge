import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { billingOrders, creditLedger, subscriptionPlans, subscriptions, webhookEvents } from "@/lib/db/schema";

export const PLAN_IDS = ["free", "merchant", "pro", "team"] as const;
export type PlanId = typeof PLAN_IDS[number];

export async function listPlans() {
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true));
}

export async function getSubscription(userId: string) {
  const rows = await db.select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
    .where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function getCreditBalance(userId: string): Promise<number> {
  const rows = await db.select({ balance: sql<number>`coalesce(sum(${creditLedger.amount}), 0)` })
    .from(creditLedger).where(eq(creditLedger.userId, userId));
  return Number(rows[0]?.balance ?? 0);
}

export async function grantCredits(userId: string, amount: number, reason: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Credit grant must be a positive integer");
  await db.insert(creditLedger).values({ userId, amount, reason });
}

export async function ensureFreeSubscription(userId: string) {
  const existing = await getSubscription(userId);
  if (existing) return existing;
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, "free")).limit(1))[0];
  if (!plan) throw new Error("Free plan is missing");
  const start = new Date();
  const end = new Date(start); end.setMonth(end.getMonth() + 1);
  await db.insert(subscriptions).values({ userId, planId: plan.id, provider: "internal", status: "active", currentPeriodStart: start, currentPeriodEnd: end });
  return getSubscription(userId);
}

export async function consumeCredit(userId: string, input: { projectId?: string; generationId?: string; reason?: string }) {
  const balance = await getCreditBalance(userId);
  if (balance < 1) return { ok: false as const, balance };
  await db.insert(creditLedger).values({ userId, projectId: input.projectId, generationId: input.generationId, amount: -1, reason: input.reason ?? "image_generation" });
  return { ok: true as const, balance: balance - 1 };
}

export async function refundCredit(userId: string, input: { projectId?: string; generationId?: string; reason?: string }) {
  await db.insert(creditLedger).values({ userId, projectId: input.projectId, generationId: input.generationId, amount: 1, reason: input.reason ?? "generation_failed_refund" });
}

export async function createPendingOrder(userId: string, planId: PlanId, provider: string, currency: string) {
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1))[0];
  if (!plan || plan.id === "free") throw new Error("Paid plan required");
  const order = (await db.insert(billingOrders).values({ userId, planId, provider, amountCents: plan.priceCents, currency }).returning())[0];
  return { order, plan };
}

export async function recordWebhookOnce(id: string, provider: string, eventType: string) {
  try { await db.insert(webhookEvents).values({ id, provider, eventType }); return true; }
  catch { return false; }
}

export async function activateSubscriptionForOrder(orderId: string, providerOrderId: string, payload: Record<string, unknown>) {
  const order = (await db.select().from(billingOrders).where(eq(billingOrders.id, orderId)).limit(1))[0];
  if (!order) throw new Error("Order not found");
  if (order.status === "paid") return order;
  const start = new Date();
  const end = new Date(start); end.setMonth(end.getMonth() + 1);
  await db.update(billingOrders).set({ status: "paid", providerOrderId, rawPayload: payload, updatedAt: new Date() }).where(eq(billingOrders.id, orderId));
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, order.planId)).limit(1))[0];
  if (!plan) throw new Error("Plan not found");
  await db.insert(subscriptions).values({ userId: order.userId, planId: plan.id, provider: order.provider, providerSubscriptionId: providerOrderId, status: "active", currentPeriodStart: start, currentPeriodEnd: end });
  await grantCredits(order.userId, plan.monthlyCredits, `subscription:${plan.id}`);
  return order;
}
