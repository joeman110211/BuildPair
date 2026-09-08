export type UserRole = 'customer' | 'trader';
export type SubscriptionTier = 'free' | 'basic' | 'featured';
export type JobStatus = 'open' | 'quoted' | 'in_progress' | 'completed' | 'cancelled';
export type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type TraderProfileTemplate = 'classic' | 'portfolio' | 'modern';
export type TraderProfileColour = 'burnt_orange' | 'navy' | 'forest' | 'charcoal' | 'burgundy';
export type PaymentMode = 'undecided' | 'buildpair' | 'external';
export type PaymentStageKind = 'materials' | 'deposit' | 'stage' | 'final';

export interface PaymentStagePlan {
  key: string;
  title: string;
  amount: number;
  kind: PaymentStageKind;
  trigger: string;
  sortOrder: number;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  activeMode: UserRole | null;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export interface BeforeAfterProject { before: string; after: string; caption?: string; }

export interface TraderCredential {
  id: string; credentialType: string; name: string; issuer?: string | null; referenceNumber?: string | null; documentUrl?: string | null; expiresAt?: string | null;
  status: 'submitted' | 'verified' | 'rejected' | 'expired'; verifiedAt?: string | null; rejectionReason?: string | null;
}

export interface AvailabilitySlot { id: string; startsAt: string; endsAt: string; status: 'available' | 'busy' | 'unavailable'; note?: string | null; }

export interface ProjectStory {
  id: string; traderId?: string; title: string; locationLabel?: string | null; summary: string; beforePhotos: string[]; afterPhotos: string[];
  durationDays?: number | null; completedAt?: string | null; createdAt?: string;
}

export interface TraderProfile {
  id: string;
  userId: string;
  businessName: string;
  tradeCategory: string;
  subSkills: string[];
  tradeCategories?: string[];
  serviceSelections?: Record<string, string[]>;
  categoriesChangedAt?: string | null;
  categoryChangeAvailableAt?: string | null;
  categoryLimit?: number;
  bio: string;
  radiusMiles: number;
  postcode?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  qualifications?: string[];
  externalLinks: Record<string, string>;
  photos: string[];
  template?: TraderProfileTemplate;
  colourTheme?: TraderProfileColour;
  coverPhotoUrl?: string | null;
  profileImageUrl?: string | null;
  logoUrl?: string | null;
  yearsExperience?: number;
  yearEstablished?: number | null;
  serviceAreas?: string[];
  beforeAfterProjects?: BeforeAfterProject[];
  verifiedCredentialCount?: number;
  availabilitySummary?: string | null;
  rankingScore?: number;
  createdAt?: string;
  subscriptionTier: SubscriptionTier;
  isSubscriptionActive: boolean;
  trialEndsAt?: string | null;
  averageRating: number;
  reviewCount: number;
  stripeAccountId?: string | null;
  isPreview?: boolean;
  shareOnly?: boolean;
  canRequestQuote?: boolean;
  monthlyQuotesUsed?: number;
  monthlyQuoteLimit?: number;
  monthlyQuoteResetAt?: string;
}

export interface Job {
  id: string;
  customerId: string;
  targetTraderId: string | null;
  title: string;
  category: string;
  propertyType: string;
  postcode: string | null;
  locationLabel: string | null;
  latitude?: number | null;
  longitude?: number | null;
  urgency: string;
  description: string;
  aiGeneratedSpec: string | null;
  budgetRange: string;
  photos: string[];
  isEmergency?: boolean;
  scheduledStartAt?: string | null;
  status: JobStatus;
  acceptedQuoteId?: string | null;
  paymentMode?: PaymentMode;
  createdAt: string;
  quotes?: Quote[];
  isPreview?: boolean;
}

export interface Quote {
  id: string;
  jobId: string;
  traderId: string;
  businessName?: string;
  laborCost: number;
  materialsCost: number;
  vatAmount: number;
  depositAmount: number;
  totalAmount: number;
  paymentTerms: string;
  paymentSchedule?: PaymentStagePlan[];
  paymentScheduleStatus?: 'proposed' | 'customer_edited' | 'agreed';
  paymentScheduleRevision?: number;
  scope?: string | null;
  exclusions?: string | null;
  notes?: string | null;
  durationDays?: number | null;
  warrantyMonths?: number | null;
  proposedStartAt?: string | null;
  validUntil?: string | null;
  status: QuoteStatus;
}

export interface JobVariation {
  id: string; jobId: string; traderId: string; customerId: string; title: string; description: string; amountDelta: number; durationDeltaDays: number;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'; createdAt: string; respondedAt?: string | null;
}

export interface JobTimelineEvent {
  id: string; eventType: string; title: string; description?: string | null; metadata: Record<string, unknown>; actorId?: string | null; createdAt: string;
}

export interface BuildPairNotification {
  id: string; type: string; title: string; body: string; href?: string | null; readAt?: string | null; createdAt: string;
}

export interface SavedJobSearch {
  id: string; name: string; category?: string | null; keywords?: string | null; postcode?: string | null; radiusMiles: number; emergencyOnly: boolean; enabled: boolean;
}
