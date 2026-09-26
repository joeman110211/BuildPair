import { HttpError, jsonError } from '@/lib/server';

export async function POST() {
  try {
    // Direct-to-Cloudinary signatures are intentionally disabled. All user
    // images must pass through /api/uploads/image so moderation, privacy checks
    // and metadata stripping happen before an approved URL is issued.
    throw new HttpError(410, 'Direct photo uploads are no longer supported. Update BuildPair and try again.');
  } catch (error) {
    return jsonError(error);
  }
}
