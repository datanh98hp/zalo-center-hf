'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type AuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
};

export default function AuditPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await apiFetch<AuditEntry[]>('/audit'));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('zc_access_token')) {
      router.replace('/login');
      return;
    }
    void load();
  }, [load, router]);

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Về tổng quan</Link>
      <header className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Nhật ký hệ thống</h1><p className="mt-1 text-sm text-slate-500">Hoạt động gần đây trong không gian làm việc.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"><RefreshCw size={16}/> Làm mới</button>
      </header>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 font-semibold">Hoạt động gần đây</div>
        {loading && !entries.length ? <p className="p-8 text-center text-sm text-slate-500">Đang tải nhật ký…</p>
          : entries.length ? <div className="divide-y divide-slate-100">
            {entries.map(entry => <article key={entry.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-medium">{entry.action} · {entry.entityType}</p><p className="mt-1 text-xs text-slate-500">Người thực hiện: {entry.actorId ?? 'Hệ thống'}{entry.entityId ? ` · Đối tượng: ${entry.entityId}` : ''}</p></div>
                <time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString('vi-VN')}</time>
              </div>
              {entry.metadata != null && <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(entry.metadata, null, 2)}</pre>}
            </article>)}
          </div> : <p className="p-8 text-center text-sm text-slate-500">Chưa có hoạt động nào được ghi nhận.</p>}
      </section>
    </div>
  </main>;
}
