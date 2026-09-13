export type GooglePlaceCandidate = {
  id: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
};

export type GooglePlaceIdentity = GooglePlaceCandidate & {
  postcode: string | null;
  nationalPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  websiteUri: string | null;
};

export type GoogleReview = {
  rating: number;
  text: string;
  relativePublishTimeDescription: string | null;
  publishTime: string | null;
  googleMapsUri: string | null;
  author: {
    displayName: string;
    uri: string | null;
    photoUri: string | null;
  };
};

export type GoogleReviewSnapshot = {
  id: string;
  displayName: string;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  reviews: GoogleReview[];
};

export type BuildPairBusinessIdentity = {
  businessName: string;
  postcode: string | null;
  locationLabel: string | null;
  phone: string | null;
  email: string | null;
  websiteUri: string | null;
};

export type GoogleBusinessMatch = {
  status: 'verified' | 'pending_review';
  score: number;
  reasons: string[];
  signals: {
    name: boolean;
    postcode: boolean;
    phone: boolean;
    website: boolean;
    emailDomain: boolean;
    location: boolean;
  };
};

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com',
  'yahoo.com', 'yahoo.co.uk', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.co.uk',
]);

const COMPANY_SUFFIXES = new Set(['ltd', 'limited', 'llp', 'plc', 'company', 'co']);

function apiKey() {
  const value = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!value) throw new Error('Google reviews are not configured yet. GOOGLE_PLACES_API_KEY is missing.');
  return value;
}

async function googleRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? JSON.stringify((payload as { error?: unknown }).error)
      : String(payload || response.statusText);
    throw new Error(`Google Places request failed (${response.status}): ${message}`);
  }
  return payload as Record<string, unknown>;
}

export function googlePlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

function displayName(place: Record<string, unknown>) {
  const value = place.displayName as { text?: string } | undefined;
  return String(value?.text ?? '');
}

function normaliseName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !COMPANY_SUFFIXES.has(token));
}

function nameSimilarity(left: string, right: string) {
  const a = normaliseName(left);
  const b = normaliseName(right);
  if (!a.length || !b.length) return 0;
  if (a.join(' ') === b.join(' ')) return 1;
  const aSet = new Set(a);
  const bSet = new Set(b);
  const intersection = [...aSet].filter((token) => bSet.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function normalisePostcode(value: string | null | undefined) {
  return value?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
}

function normalisePhone(value: string | null | undefined) {
  let digits = value?.replace(/\D/g, '') ?? '';
  if (digits.startsWith('0044')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('44')) digits = `0${digits.slice(2)}`;
  return digits;
}

function domainFromUrl(value: string | null | undefined) {
  if (!value?.trim()) return '';
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function domainFromEmail(value: string | null | undefined) {
  const parts = value?.trim().toLowerCase().split('@') ?? [];
  return parts.length === 2 ? (parts[1]?.replace(/^www\./, '') ?? '') : '';
}

function hostMatches(left: string, right: string) {
  if (!left || !right) return false;
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

export function matchGoogleBusiness(buildPair: BuildPairBusinessIdentity, google: GooglePlaceIdentity): GoogleBusinessMatch {
  const similarity = nameSimilarity(buildPair.businessName, google.displayName);
  const nameStrong = similarity >= 0.72;
  const nameMedium = !nameStrong && similarity >= 0.45;
  const postcodeMatch = Boolean(normalisePostcode(buildPair.postcode) && normalisePostcode(buildPair.postcode) === normalisePostcode(google.postcode));
  const buildPairPhone = normalisePhone(buildPair.phone);
  const phoneMatch = Boolean(buildPairPhone && [google.nationalPhoneNumber, google.internationalPhoneNumber].some((value) => normalisePhone(value) === buildPairPhone));
  const buildPairWebsite = domainFromUrl(buildPair.websiteUri);
  const googleWebsite = domainFromUrl(google.websiteUri);
  const websiteMatch = hostMatches(buildPairWebsite, googleWebsite);
  const emailDomain = domainFromEmail(buildPair.email);
  const professionalEmail = Boolean(emailDomain && !FREE_EMAIL_DOMAINS.has(emailDomain));
  const emailDomainMatch = professionalEmail && hostMatches(emailDomain, googleWebsite);
  const locationText = buildPair.locationLabel?.trim().toLowerCase() ?? '';
  const locationMatch = Boolean(locationText.length >= 3 && google.formattedAddress.toLowerCase().includes(locationText));

  let score = 0;
  const reasons: string[] = [];
  if (nameStrong) { score += 30; reasons.push('Business name closely matches'); }
  else if (nameMedium) { score += 15; reasons.push('Business name partly matches'); }
  if (postcodeMatch) { score += 30; reasons.push('Postcode matches'); }
  if (phoneMatch) { score += 30; reasons.push('Phone number matches'); }
  if (websiteMatch) { score += 30; reasons.push('Website domain matches'); }
  if (emailDomainMatch) { score += 10; reasons.push('Verified account email domain matches the Google website'); }
  if (locationMatch) { score += 5; reasons.push('Saved location appears in the Google address'); }

  const hardIdentityMatch = postcodeMatch || phoneMatch || websiteMatch;
  const verified = nameStrong && hardIdentityMatch && score >= 60;
  if (!verified) reasons.push('BuildPair admin review required before Google reviews can appear publicly');

  return {
    status: verified ? 'verified' : 'pending_review',
    score,
    reasons,
    signals: { name: nameStrong, postcode: postcodeMatch, phone: phoneMatch, website: websiteMatch, emailDomain: emailDomainMatch, location: locationMatch },
  };
}

export async function searchGooglePlaces(query: string): Promise<GooglePlaceCandidate[]> {
  const payload = await googleRequest('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri',
    },
    body: JSON.stringify({ textQuery: query, regionCode: 'GB', pageSize: 5 }),
  });

  const places = Array.isArray(payload.places) ? payload.places : [];
  return places.map((raw) => {
    const place = raw as Record<string, unknown>;
    return {
      id: String(place.id ?? ''),
      displayName: displayName(place),
      formattedAddress: String(place.formattedAddress ?? ''),
      rating: typeof place.rating === 'number' ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      googleMapsUri: typeof place.googleMapsUri === 'string' ? place.googleMapsUri : null,
    };
  }).filter((place) => place.id && place.displayName);
}

export async function getGooglePlaceIdentity(placeId: string): Promise<GooglePlaceIdentity> {
  const payload = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount',
    },
  });
  const components = Array.isArray(payload.addressComponents) ? payload.addressComponents : [];
  const postcodeComponent = components.find((raw) => {
    const component = raw as { types?: unknown };
    return Array.isArray(component.types) && component.types.includes('postal_code');
  }) as { longText?: string; shortText?: string } | undefined;

  return {
    id: String(payload.id ?? placeId),
    displayName: displayName(payload),
    formattedAddress: String(payload.formattedAddress ?? ''),
    postcode: postcodeComponent?.longText ?? postcodeComponent?.shortText ?? null,
    nationalPhoneNumber: typeof payload.nationalPhoneNumber === 'string' ? payload.nationalPhoneNumber : null,
    internationalPhoneNumber: typeof payload.internationalPhoneNumber === 'string' ? payload.internationalPhoneNumber : null,
    websiteUri: typeof payload.websiteUri === 'string' ? payload.websiteUri : null,
    googleMapsUri: typeof payload.googleMapsUri === 'string' ? payload.googleMapsUri : null,
    rating: typeof payload.rating === 'number' ? payload.rating : null,
    userRatingCount: typeof payload.userRatingCount === 'number' ? payload.userRatingCount : null,
  };
}

export async function getGooglePlaceReviews(placeId: string): Promise<GoogleReviewSnapshot> {
  const payload = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text,reviews.relativePublishTimeDescription,reviews.publishTime,reviews.googleMapsUri,reviews.authorAttribution',
    },
  });

  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  return {
    id: String(payload.id ?? placeId),
    displayName: displayName(payload),
    rating: typeof payload.rating === 'number' ? payload.rating : null,
    userRatingCount: typeof payload.userRatingCount === 'number' ? payload.userRatingCount : null,
    googleMapsUri: typeof payload.googleMapsUri === 'string' ? payload.googleMapsUri : null,
    reviews: reviews.map((raw) => {
      const review = raw as Record<string, unknown>;
      const text = review.text as { text?: string } | undefined;
      const author = review.authorAttribution as { displayName?: string; uri?: string; photoUri?: string } | undefined;
      return {
        rating: typeof review.rating === 'number' ? review.rating : 0,
        text: String(text?.text ?? ''),
        relativePublishTimeDescription: typeof review.relativePublishTimeDescription === 'string' ? review.relativePublishTimeDescription : null,
        publishTime: typeof review.publishTime === 'string' ? review.publishTime : null,
        googleMapsUri: typeof review.googleMapsUri === 'string' ? review.googleMapsUri : null,
        author: {
          displayName: String(author?.displayName ?? 'Google reviewer'),
          uri: typeof author?.uri === 'string' ? author.uri : null,
          photoUri: typeof author?.photoUri === 'string' ? author.photoUri : null,
        },
      };
    }),
  };
}
