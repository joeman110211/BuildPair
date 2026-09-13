import { describe, expect, it } from 'vitest';
import { matchGoogleBusiness, type BuildPairBusinessIdentity, type GooglePlaceIdentity } from '@/lib/google-reviews';

const buildPair: BuildPairBusinessIdentity = {
  businessName: 'Smith Builders Ltd',
  postcode: 'GU1 4AA',
  locationLabel: 'Guildford',
  phone: '01483 123456',
  email: 'joe@smithbuilders.co.uk',
  websiteUri: 'https://www.smithbuilders.co.uk',
};

const google: GooglePlaceIdentity = {
  id: 'place-1',
  displayName: 'Smith Builders Limited',
  formattedAddress: 'Guildford, Surrey GU1 4AA, UK',
  postcode: 'GU1 4AA',
  nationalPhoneNumber: '01483 123456',
  internationalPhoneNumber: '+44 1483 123456',
  websiteUri: 'https://smithbuilders.co.uk/',
  googleMapsUri: 'https://maps.google.com/example',
  rating: 4.9,
  userRatingCount: 83,
};

describe('Google business verification matching', () => {
  it('auto-verifies a close business name with hard identity matches', () => {
    const result = matchGoogleBusiness(buildPair, google);
    expect(result.status).toBe('verified');
    expect(result.signals.name).toBe(true);
    expect(result.signals.postcode).toBe(true);
    expect(result.signals.phone).toBe(true);
    expect(result.signals.website).toBe(true);
    expect(result.signals.emailDomain).toBe(true);
  });

  it('normalises UK +44 and 0-prefixed phone numbers', () => {
    const result = matchGoogleBusiness({ ...buildPair, websiteUri: null, postcode: null }, { ...google, nationalPhoneNumber: null, postcode: null, websiteUri: null });
    expect(result.signals.phone).toBe(true);
    expect(result.status).toBe('verified');
  });

  it('does not use a generic Gmail address as business identity evidence', () => {
    const result = matchGoogleBusiness({ ...buildPair, email: 'smithbuilders@gmail.com', websiteUri: null }, google);
    expect(result.signals.emailDomain).toBe(false);
  });

  it('sends a weak or ambiguous match to admin review instead of publishing it', () => {
    const result = matchGoogleBusiness(
      { ...buildPair, businessName: 'Smith Renovations', postcode: 'GU2 7AA', phone: '07700 900123', email: 'smith@gmail.com', websiteUri: null },
      { ...google, displayName: 'Smith Builders Limited', postcode: 'GU1 4AA', nationalPhoneNumber: '01483 123456', internationalPhoneNumber: '+44 1483 123456', websiteUri: 'https://smithbuilders.co.uk' },
    );
    expect(result.status).toBe('pending_review');
    expect(result.reasons.at(-1)).toMatch(/admin review/i);
  });
});
