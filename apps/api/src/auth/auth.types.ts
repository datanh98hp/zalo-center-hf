import { Request } from 'express';
export type AuthUser = { sub: string; tenantId: string; role: 'OWNER'|'ADMIN'|'MANAGER'|'AGENT' };
export type AuthRequest = Request & { user?: AuthUser; accessToken?: string };
