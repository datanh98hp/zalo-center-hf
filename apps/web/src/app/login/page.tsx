"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
export default function LoginPage() {
  const router = useRouter();
  const [tenantId,setTenantId] = useState(""); const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({tenantId,email,password}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Đăng nhập thất bại");
      sessionStorage.setItem("zc_access_token", data.accessToken); sessionStorage.setItem("zc_user", JSON.stringify(data.user)); router.push("/inbox");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối API"); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
    <div className="mb-7 flex items-center gap-3"><div className="rounded-xl bg-blue-600 p-3 text-white"><MessageCircle size={24}/></div><div><h1 className="text-xl font-bold">Zalo Center</h1><p className="text-sm text-slate-500">Đăng nhập workspace</p></div></div>
    <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Workspace ID<input required value={tenantId} onChange={e=>setTenantId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="tenant_id"/></label><label className="block text-sm font-medium">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" autoComplete="username"/></label><label className="block text-sm font-medium">Mật khẩu<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" autoComplete="current-password"/></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?"Đang đăng nhập…":"Đăng nhập"}</button></form>
    <p className="mt-5 flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="shrink-0"/> Phiên đăng nhập được lưu trong session của tab trình duyệt và có thể thu hồi bằng chức năng đăng xuất.</p>
  </div></main>;
}
