export type PayoutStatusKey =
  | 'not_started'
  | 'in_progress'
  | 'pending_verification'
  | 'action_required'
  | 'ready'
  | 'restricted'
  | 'status_error';

export type PayoutStatusSnapshot = {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  currentlyDue?: string[];
  pastDue?: string[];
  disabledReason?: string | null;
};

export type PayoutStatus = {
  key: PayoutStatusKey;
  label: string;
  detail: string;
  nextAction: string;
  requirements: string[];
  ready: boolean;
  lastCheckedAt?: string;
};

function friendlyRequirement(value: string) {
  const labels: Record<string, string> = {
    'individual.verification.document': 'Identity document',
    'individual.verification.additional_document': 'Additional identity document',
    'individual.address.line1': 'Home address',
    'individual.dob.day': 'Date of birth',
    'individual.first_name': 'First name',
    'individual.last_name': 'Last name',
    'external_account': 'Bank account',
    'business_profile.url': 'Business website or profile',
    'business_profile.mcc': 'Business type',
    'tos_acceptance.date': 'Stripe terms acceptance',
  };
  if (labels[value]) return labels[value];
  const tail = value.split('.').pop() || value;
  return tail.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function classifyPayoutStatus(snapshot: PayoutStatusSnapshot): PayoutStatus {
  const current = snapshot.currentlyDue ?? [];
  const pastDue = snapshot.pastDue ?? [];
  const requirements = Array.from(new Set([...pastDue, ...current])).map(friendlyRequirement);

  if (!snapshot.hasAccount) {
    return {
      key: 'not_started',
      label: 'Not started',
      detail: 'Stripe payout onboarding has not been started for this BuildPair account.',
      nextAction: 'Set up payouts with Stripe before a homeowner can use BuildPair protected payments with you.',
      requirements: [],
      ready: false,
    };
  }

  if (snapshot.payoutsEnabled) {
    return {
      key: 'ready',
      label: 'Ready',
      detail: 'Stripe has confirmed that this connected account can receive BuildPair payouts.',
      nextAction: 'No payout setup action is required.',
      requirements: [],
      ready: true,
    };
  }

  if (pastDue.length || snapshot.disabledReason) {
    return {
      key: 'restricted',
      label: 'Action required',
      detail: snapshot.disabledReason
        ? 'Stripe has restricted payouts until account requirements are resolved.'
        : 'Stripe is waiting for overdue account information before payouts can be enabled.',
      nextAction: 'Open Stripe and complete the outstanding requirements.',
      requirements,
      ready: false,
    };
  }

  if (current.length) {
    return {
      key: 'action_required',
      label: 'Action required',
      detail: 'Stripe still needs information before it can enable payouts.',
      nextAction: 'Open Stripe and complete the items shown below.',
      requirements,
      ready: false,
    };
  }

  if (snapshot.detailsSubmitted) {
    return {
      key: 'pending_verification',
      label: 'Verification pending',
      detail: 'Stripe has received your onboarding information but has not enabled payouts yet.',
      nextAction: 'No further action is currently shown. Refresh the status later if Stripe is still reviewing the account.',
      requirements: [],
      ready: false,
    };
  }

  return {
    key: 'in_progress',
    label: 'Setup incomplete',
    detail: 'Stripe onboarding has started but has not been fully submitted.',
    nextAction: 'Return to Stripe and finish payout onboarding.',
    requirements: [],
    ready: false,
  };
}
