export type GooglePlaceCandidate = {
  id: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
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

export async function searchGooglePlaces(query: string): Promise<GooglePlaceCandidate[]> {
  const payload = await googleRequest('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri',
    },
    body: JSON.stringify({ textQuery: query, regionCode: 'GB', maxResultCount: 5 }),
  });

  const places = Array.isArray(payload.places) ? payload.places : [];
  return places.map((raw) => {
    const place = raw as Record<string, unknown>;
    const displayName = place.displayName as { text?: string } | undefined;
    return {
      id: String(place.id ?? ''),
      displayName: String(displayName?.text ?? ''),
      formattedAddress: String(place.formattedAddress ?? ''),
      rating: typeof place.rating === 'number' ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      googleMapsUri: typeof place.googleMapsUri === 'string' ? place.googleMapsUri : null,
    };
  }).filter((place) => place.id && place.displayName);
}

export async function getGooglePlaceReviews(placeId: string): Promise<GoogleReviewSnapshot> {
  const payload = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text,reviews.relativePublishTimeDescription,reviews.publishTime,reviews.googleMapsUri,reviews.authorAttribution',
    },
  });

  const displayName = payload.displayName as { text?: string } | undefined;
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  return {
    id: String(payload.id ?? placeId),
    displayName: String(displayName?.text ?? ''),
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
