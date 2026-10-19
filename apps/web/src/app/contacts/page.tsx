'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Search, Users } from 'lucide-react';
import { apiFetch, Contact } from '@/lib/api';

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [zaloId, setZaloId] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await apiFetch<Contact[]>(`/contacts${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được danh sách. Hãy đăng nhập trước.'); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await apiFetch<Contact>('/contacts', { method: 'POST', body: JSON.stringify({ displayName, zaloId, phone }) });
      setDisplayName(''); setZaloId(''); setPhone(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tạo được khách hàng'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Về tổng quan</Link>
      <header className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Khách hàng</h1><p className="mt-1 text-sm text-slate-500">Tra cứu theo tên, Zalo ID hoặc số điện thoại.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><RefreshCw size={16}/> Làm mới</button></header>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 p-4"><Search size={17} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nhập từ khóa tìm kiếm..." className="w-full text-sm outline-none"/></div>
          <div className="divide-y divide-slate-100">
            {items.map(contact=><article key={contact.id} className="p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Users size={18}/></div><div className="min-w-0 flex-1"><h2 className="font-semibold">{contact.displayName || 'Chưa có tên'}</h2><p className="mt-1 break-all text-xs text-slate-500">{contact.identifiers.map(x=>`${x.type}: ${x.value}`).join(' · ') || 'Chưa có định danh'}</p><p className="mt-2 text-xs text-slate-600">Phụ trách: {contact.assignments?.[0]?.user?.displayName || 'Chưa phân công'}</p></div></div></article>)}
            {!items.length && <div className="p-10 text-center text-sm text-slate-500">Chưa có dữ liệu hoặc chưa thể kết nối API.</div>}
          </div>
        </section>
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Plus size={18}/><h2 className="font-semibold">Thêm khách hàng</h2></div><form onSubmit={create} className="mt-4 space-y-3">
          <label className="block text-sm">Tên hiển thị<input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" placeholder="Nguyễn Văn A"/></label>
          <label className="block text-sm">Zalo ID<input value={zaloId} onChange={e=>setZaloId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" placeholder="ID định danh từ nguồn hợp lệ"/></label>
          <label className="block text-sm">Số điện thoại<input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" placeholder="+84901234567"/></label>
          <p className="text-xs leading-5 text-slate-500">Zalo ID và số điện thoại được lưu thành định danh riêng. Không tự động suy đoán mã quốc gia.</p>
          <button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">{busy?'Đang lưu…':'Lưu khách hàng'}</button>
        </form></section>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  </main>;
}
