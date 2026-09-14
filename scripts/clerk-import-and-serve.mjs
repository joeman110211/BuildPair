import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClerkClient } = require('@clerk/backend');

function decodeMigrationPayload(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const text = Buffer.from(padded, 'base64url').toString('utf8');
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('CLERK_MIGRATION_USERS_B64 must decode to an array');
  return parsed;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function migrateConfiguredClerkUsers() {
  const encoded = clean(process.env.CLERK_MIGRATION_USERS_B64);
  if (!encoded) return;

  const secretKey = clean(process.env.CLERK_SECRET_KEY);
  if (!/^sk_live_/.test(secretKey)) {
    throw new Error('Refusing Clerk migration because CLERK_SECRET_KEY is not a production key');
  }

  const records = decodeMigrationPayload(encoded);
  const clerk = createClerkClient({ secretKey });
  let created = 0;
  let skipped = 0;

  for (const record of records) {
    const externalId = clean(record?.externalId);
    const email = clean(record?.email).toLowerCase();
    const firstName = clean(record?.firstName);
    const lastName = clean(record?.lastName);
    const passwordDigest = clean(record?.passwordDigest);
    const passwordHasher = clean(record?.passwordHasher);
    const createdAtRaw = clean(record?.createdAt);

    if (!externalId || !email) throw new Error('Clerk migration record is missing an external ID or email address');

    const existing = await clerk.users.getUserList({ externalId: [externalId], limit: 1 });
    if (existing.data.length) {
      console.log(`[clerk-migration] existing user preserved for ${externalId}`);
      skipped += 1;
      continue;
    }

    const params = {
      externalId,
      emailAddress: [email],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      skipLegalChecks: true,
    };

    if (createdAtRaw) params.createdAt = new Date(createdAtRaw);
    if (passwordDigest && passwordHasher) {
      params.passwordDigest = passwordDigest;
      params.passwordHasher = passwordHasher;
    }

    await clerk.users.createUser(params);
    console.log(`[clerk-migration] created production user for ${externalId}`);
    created += 1;
  }

  console.log(`[clerk-migration] complete: ${created} created, ${skipped} already present`);
}

await migrateConfiguredClerkUsers();
await import('../server.mjs');
