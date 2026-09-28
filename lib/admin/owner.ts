import { HttpError, requireAdmin } from '@/lib/server';

const DEFAULT_OWNER_USER_ID = 'user_3IxRRzvxtj2pBKrzsGA4jeDsebm';

export function buildPairOwnerUserId() {
  return process.env.BUILDPAIR_OWNER_USER_ID?.trim() || DEFAULT_OWNER_USER_ID;
}

export async function requireOwnerAdmin(request: Request) {
  const result = await requireAdmin(request);
  if (result.user.id !== buildPairOwnerUserId()) {
    throw new HttpError(403, 'Only the BuildPair owner can manage administrator access');
  }
  return result;
}
