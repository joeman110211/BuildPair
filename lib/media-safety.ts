import { HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export type MediaKind = 'job' | 'trader';

export const MEDIA_FOLDERS: Record<MediaKind, string> = {
  job: 'buildpair/job-photos',
  trader: 'buildpair/trader-gallery',
};

export async function recordApprovedMedia(input: {
  userId: string;
  kind: MediaKind;
  url: string;
  publicId?: string | null;
  reason?: string | null;
}) {
  await getSql()`
    INSERT INTO media_uploads(user_id, kind, url, provider_public_id, moderation_status, moderation_reason)
    VALUES (${input.userId}, ${input.kind}, ${input.url}, ${input.publicId ?? null}, 'approved', ${input.reason ?? null})
    ON CONFLICT (url) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      kind = EXCLUDED.kind,
      provider_public_id = EXCLUDED.provider_public_id,
      moderation_status = 'approved',
      moderation_reason = EXCLUDED.moderation_reason
  `;
}

export async function assertApprovedMediaUrls(userId: string, kind: MediaKind, urls: readonly string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return;

  const rows = await getSql()`
    SELECT url
    FROM media_uploads
    WHERE user_id = ${userId}
      AND kind = ${kind}
      AND moderation_status IN ('approved', 'grandfathered')
      AND url = ANY(${unique}::text[])
  ` as unknown as { url: string }[];

  const allowed = new Set(rows.map((row) => row.url));
  const rejected = unique.filter((url) => !allowed.has(url));
  if (rejected.length) {
    throw new HttpError(400, 'One or more photos were not uploaded through BuildPair\'s safety check. Remove them and upload them again.');
  }
}
