export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type ApiUser = { id: string; tenantId: string; email: string; displayName: string; role: string };
export type Contact = {
  id: string;
  displayName?: string | null;
  identifiers: { id: string; type: string; value: string; normalized: string }[];
  assignments?: { id: string; label: string; user: { id: string; displayName: string } }[];
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('zc_access_token');
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload?.message.join(', ') : payload?.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
