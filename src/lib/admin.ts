import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, billingOrders, creditLedger, subscriptions, subscriptionPlans, users, webhookEvents } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || user.disabled) throw new Error("ADMIN_REQUIRED");
  return user;
}

export async function writeAudit(input: { actorUserId: string; action: string; targetType: string; targetId: string; before?: unknown; after?: unknown; reason?: string }) {
  await db.insert(auditLogs).values({ ...input, before: input.before as Record<string, unknown> | undefined, after: input.after as Record<string, unknown> | undefined });
}

export async function adminOverview() {
  const [userCount, activeSubscriptions, paidOrders, credits, events] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select({ total: sql<number>`coalesce(sum(${billingOrders.amountCents}), 0)` }).from(billingOrders).where(eq(billingOrders.status, "paid")),
    db.select({ total: sql<number>`coalesce(sum(${creditLedger.amount}), 0)` }).from(creditLedger),
    db.select({ count: sql<number>`count(*)` }).from(webhookEvents),
  ]);
  return { users: userCount[0]?.count ?? 0, activeSubscriptions: activeSubscriptions[0]?.count ?? 0, paidRevenueCents: paidOrders[0]?.total ?? 0, creditsIssued: credits[0]?.total ?? 0, webhookEvents: events[0]?.count ?? 0 };
}

export async function adminUsers(search?: string) {
  const condition = search ? like(users.email, `%${search.trim().toLowerCase()}%`) : undefined;
  return db.select({ id: users.id, email: users.email, role: users.role, disabled: users.disabled, createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users).where(condition).orderBy(desc(users.createdAt)).limit(100);
}

export { billingOrders, creditLedger, subscriptions, subscriptionPlans, users, webhookEvents };
