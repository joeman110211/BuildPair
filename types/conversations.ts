export type SiteVisitStatus = 'proposed' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

export type ConversationStatus = {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: 'open' | 'quoted' | 'in_progress' | 'completed' | 'cancelled';
  acceptedQuoteId: string | null;
  customerId: string;
  traderId: string;
  quoteId: string | null;
  quoteStatus: 'pending' | 'accepted' | 'declined' | 'withdrawn' | null;
  siteVisitId: string | null;
  siteVisitStatus: SiteVisitStatus | null;
  siteVisitProposedAt: string | null;
  siteVisitNote: string | null;
  moderationStatus: 'open' | 'warned' | 'restricted' | 'closed';
  moderationReason: string;
  moderationUpdatedAt: string | null;
};
