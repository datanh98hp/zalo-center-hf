export type RealtimeEvent =
  | { type: 'message.created'; tenantId: string; conversationId: string; messageId: string }
  | { type: 'message.status'; tenantId: string; conversationId: string; messageId: string; status: string }
  | { type: 'assignment.updated'; tenantId: string; contactId: string; employeeId: string; label: string };

export type ContactLookup = {
  zaloId?: string;
  phone?: string;
};

export type ApiError = {
  statusCode: number;
  message: string | string[];
  error?: string;
};
