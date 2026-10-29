"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Plan = { id: string; name: string; monthlyCredits: number; priceCents: number; currency: string };
export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/billing/plans").then((r) => r.json()).then((d) => setPlans(d.plans ?? [])); }, []);
  async function choose(planId: string) { setMessage(""); const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, region: "intl" }) }); const d = await r.json(); if (r.status === 401) { window.location.assign("/login"); return; } setMessage(d.configured ? "正在跳转支付…" : "支付渠道尚未配置。当前已创建测试订单，配置支付密钥后即可上线。"); }
  return <main className="mx-auto w-full max-w-6xl px-6 py-16"><div className="mx-auto max-w-2xl text-center"><h1 className="mt-3 text-4xl font-semibold tracking-tight">让商品图直接变成可发布素材</h1><p className="mt-4 text-muted-foreground">按生成组计费。失败任务不扣额度，上传一次商品图即可生成多种场景。</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{plans.filter((p) => p.id !== "free").map((plan) => <section key={plan.id} className="rounded-2xl border border-border/60 bg-card p-6"><h2 className="text-xl font-semibold">{plan.name}</h2><p className="mt-5 text-4xl font-semibold">¥{Math.round(plan.priceCents / 100)}<span className="text-sm font-normal text-muted-foreground"> / 月</span></p><p className="mt-3 text-sm text-muted-foreground">每月 {plan.monthlyCredits} 组生成额度</p><button onClick={() => choose(plan.id)} className="mt-8 w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground">选择套餐</button></section>)}</div>{message && <p className="mx-auto mt-8 max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-200">{message}</p>}<p className="mt-10 text-center text-sm text-muted-foreground">还在体验？<Link href="/register" className="ml-1 text-primary hover:underline">注册即可获得 5 组免费额度</Link></p></main>;
}
