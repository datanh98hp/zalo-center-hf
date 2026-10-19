/**
 * Adapter contract: implement only against documented, authorized provider APIs.
 * Do not assume personal-account inbox access exists in the official Zalo OA API.
 */
export type NormalizedInboundMessage = {
  provider: 'zalo-oa' | 'other';
  accountExternalId: string;
  conversationExternalId: string;
  contactExternalId: string;
  contactDisplayName?: string;
  messageExternalId: string;
  text?: string;
  occurredAt: Date;
};

export interface IntegrationProvider {
  verifyWebhook(headers: Record<string, string | string[] | undefined>, body: unknown): boolean;
  normalizeInbound(body: unknown): NormalizedInboundMessage[];
  sendMessage(input: {
    accountExternalId: string;
    recipientExternalId: string;
    text: string;
  }): Promise<{ providerMessageId: string; acceptedAt: Date }>;
}
