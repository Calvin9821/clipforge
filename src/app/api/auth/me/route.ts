import { NextResponse } from "next/server";
import { getCurrentUser, getDefaultWorkspace } from "@/lib/auth";
import { getCreditBalance, getSubscription } from "@/lib/billing";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role }, workspace: await getDefaultWorkspace(user.id), subscription: await getSubscription(user.id), credits: await getCreditBalance(user.id) });
}
