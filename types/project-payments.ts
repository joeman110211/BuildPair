export type ExternalPaymentRecord = {
  id: string;
  milestoneId: string;
  amount: number;
  payerConfirmedAt: string | null;
  recipientConfirmedAt: string | null;
  payerNote: string;
  recipientNote: string;
};

export type PaymentDispute = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  disputeReason: string | null;
  disputeStatus: 'open' | 'trader_response' | 'escalated' | 'resolved';
  disputeResponse: string | null;
  disputeResponseAt: string | null;
  disputeEscalatedAt: string | null;
  disputeResolvedAt: string | null;
  disputeResolutionNote: string | null;
  refundRequestedAt: string | null;
  refundApprovedAt: string | null;
};
