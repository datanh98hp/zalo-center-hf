import { createHmac, timingSafeEqual } from 'node:crypto';
import { decryptJson, encryptJson } from './secret-box';

export type OaCredentials = { appId: string; appSecret: string; accessToken: string; refreshToken: string; expiresAt: number };
export type SendResult = { messageId: string; raw: unknown };

export class ZaloOaProvider {
  authorizeUrl(input: { appId: string; redirectUri: string; state: string }): string {
    const url = new URL(process.env.ZALO_OA_AUTHORIZE_URL ?? 'https://oauth.zaloapp.com/v4/oa/permission');
    url.searchParams.set('app_id', input.appId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('state', input.state);
    return url.toString();
  }

  async exchangeCode(input: { appId: string; appSecret: string; code: string }): Promise<OaCredentials> {
    const endpoint = process.env.ZALO_OA_TOKEN_URL ?? 'https://oauth.zaloapp.com/v4/oa/access_token';
    const form = new URLSearchParams({ app_id: input.appId, code: input.code, grant_type: 'authorization_code' });
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: input.appSecret }, body: form,
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string') {
      throw new Error(`Zalo OA token exchange failed (HTTP ${response.status}, code ${String(data.error ?? data.error_name ?? 'unknown')})`);
    }
    const expiresIn = Number(data.expires_in ?? 0);
    return { appId: input.appId, appSecret: input.appSecret, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + expiresIn * 1000 };
  }

  async refresh(credentials: OaCredentials): Promise<OaCredentials> {
    const endpoint = process.env.ZALO_OA_TOKEN_URL ?? 'https://oauth.zaloapp.com/v4/oa/access_token';
    const form = new URLSearchParams({ app_id: credentials.appId, refresh_token: credentials.refreshToken, grant_type: 'refresh_token' });
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: credentials.appSecret }, body: form,
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string') {
      throw new Error(`Zalo OA token refresh failed (HTTP ${response.status})`);
    }
    return { ...credentials, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + Number(data.expires_in ?? 0) * 1000 };
  }

  async sendText(credentials: OaCredentials, recipientUserId: string, text: string): Promise<SendResult> {
    const base = (process.env.ZALO_OA_API_BASE ?? 'https://openapi.zalo.me/v3.0/oa').replace(/\/$/, '');
    const response = await fetch(`${base}/message/cs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', access_token: credentials.accessToken },
      body: JSON.stringify({ recipient: { user_id: recipientUserId }, message: { text } }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json() as Record<string, unknown>;
    const error = Number(data.error ?? 0);
    if (!response.ok || error !== 0) throw new Error(`Zalo OA send failed (HTTP ${response.status}, provider error ${error})`);
    const messageId = String((data.data as Record<string, unknown> | undefined)?.message_id ?? (data.data as Record<string, unknown> | undefined)?.msg_id ?? '');
    return { messageId, raw: data };
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined, appSecret: string): boolean {
    if (!signature) return false;
    // Zalo OA webhook signature is HMAC-SHA256 of the raw request body with the app secret.
    const expected = createHmac('sha256', appSecret).update(rawBody).digest();
    const actual = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  static encodeCredentials(credentials: OaCredentials): string { return encryptJson(credentials); }
  static decodeCredentials(encoded: string): OaCredentials { return decryptJson<OaCredentials>(encoded); }
}
