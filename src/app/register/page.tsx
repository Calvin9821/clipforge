"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setError(""); const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await response.json().catch(() => ({})); setLoading(false); if (!response.ok) { setError(data.error || "注册失败"); return; } router.push("/start"); router.refresh(); }
  return <main className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-6 py-12"><form onSubmit={submit} className="w-full space-y-6 rounded-2xl border border-border/60 bg-card p-8 shadow-xl"><div><h1 className="mt-2 text-3xl font-semibold">创建免费账号</h1><p className="mt-2 text-sm text-muted-foreground">注册即获得 5 组免费商品素材生成额度。</p></div><label className="block text-sm">邮箱<input className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="block text-sm">密码<input className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="text-sm text-destructive">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-60">{loading ? "创建中…" : "创建账号"}</button><p className="text-center text-sm text-muted-foreground">已有账号？ <Link className="text-primary hover:underline" href="/login">登录</Link></p></form></main>;
}
