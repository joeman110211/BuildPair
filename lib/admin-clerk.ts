import { createClerkClient } from '@clerk/backend';

export type AdminClerkIdentity = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string | null;
  isTestFixture: boolean;
};

type Cache = {
  expiresAt: number;
  users: AdminClerkIdentity[];
};

const CACHE_MS = 60_000;
let cache: Cache | null = null;

function fixtureEmail(email: string | null) {
  if (!email) return false;
  const value = email.toLowerCase();
  return value.startsWith('buildpair-fixture-') && value.includes('+clerk_test_');
}

export function invalidateAdminClerkIdentityCache() {
  cache = null;
}

export async function listAdminClerkIdentities(): Promise<AdminClerkIdentity[] | null> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return null;
  if (cache && cache.expiresAt > Date.now()) return cache.users;

  const clerk = createClerkClient({ secretKey });
  const users: AdminClerkIdentity[] = [];
  let offset = 0;

  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const page = await clerk.users.getUserList({ limit: 100, offset });
    for (const user of page.data) {
      const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
      const createdAt = typeof user.createdAt === 'number' ? new Date(user.createdAt).toISOString() : null;
      users.push({ id: user.id, email, name, createdAt, isTestFixture: fixtureEmail(email) });
    }
    if (!page.data.length || users.length >= page.totalCount) break;
    offset += page.data.length;
  }

  users.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  cache = { users, expiresAt: Date.now() + CACHE_MS };
  return users;
}
