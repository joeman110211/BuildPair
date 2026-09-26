import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { MEDIA_FOLDERS, recordApprovedMedia, type MediaKind } from '@/lib/media-safety';

const DEFAULT_CLOUDINARY_CLOUD_NAME = 'qrrcn7ma';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const moderationSchema = z.object({
  decision: z.enum(['allow', 'block']),
  reason: z.string().trim().max(300),
  sexualOrNude: z.boolean(),
  graphicViolence: z.boolean(),
  hateOrExtremism: z.boolean(),
  threateningOrWeaponFocused: z.boolean(),
  illegalDrugContent: z.boolean(),
  contactDetails: z.boolean(),
  exactAddress: z.boolean(),
  sensitiveDocumentOrFinancialInfo: z.boolean(),
  spamOrClearlyIrrelevant: z.boolean(),
});

function uploadKind(value: FormDataEntryValue | null): MediaKind {
  if (value === 'job' || value === 'trader') return value;
  throw new HttpError(400, 'Invalid upload type');
}

function safeBlockReason(result: z.infer<typeof moderationSchema>) {
  if (result.contactDetails || result.exactAddress) {
    return 'This photo appears to contain contact details or an exact address. Crop or cover phone numbers, email addresses and address details, then upload it again.';
  }
  if (result.sensitiveDocumentOrFinancialInfo) {
    return 'This photo appears to contain sensitive identification, banking or payment information. Remove or cover those details before uploading.';
  }
  if (result.sexualOrNude) return 'This photo appears to contain nudity or sexual content, which cannot be uploaded to BuildPair.';
  if (result.graphicViolence) return 'This photo appears to contain graphic violent content, which cannot be uploaded to BuildPair.';
  if (result.hateOrExtremism) return 'This photo appears to contain hateful or extremist content, which cannot be uploaded to BuildPair.';
  if (result.threateningOrWeaponFocused) return 'This photo appears to contain threatening or weapon-focused content that is not appropriate for BuildPair.';
  if (result.illegalDrugContent) return 'This photo appears to contain illegal drug content that is not appropriate for BuildPair.';
  if (result.spamOrClearlyIrrelevant) return 'This photo does not appear relevant to a BuildPair job, property or tradesperson profile.';
  return result.reason || 'This photo could not be accepted by BuildPair\'s safety check.';
}

async function moderateImage(input: { bytes: Buffer; mimeType: string; kind: MediaKind }) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new HttpError(503, 'Photo safety checking is temporarily unavailable. Please try again shortly.');

  const model = process.env.GEMINI_MODERATION_MODEL?.trim()
    || process.env.GEMINI_MODEL?.trim()
    || 'gemini-3.5-flash';
  const ai = new GoogleGenAI({ apiKey: key });
  const context = input.kind === 'job'
    ? 'a homeowner job photo showing a property, defect, access, room, materials or work required'
    : 'a tradesperson profile, logo, team/work photo, portfolio image, van, completed work or before/after project';

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType: input.mimeType,
            data: input.bytes.toString('base64'),
          },
        },
        {
          text: `You are the safety gate for BuildPair, a UK home-improvement marketplace. Inspect the supplied image itself and any visible text in it.

Expected context: ${context}.

Block the image if ANY of these are present:
- explicit nudity, sexual acts, pornographic or clearly sexualised content;
- graphic gore or severe visible injury;
- hateful/extremist propaganda or symbols used in an extremist/hateful context;
- weapons displayed in a threatening, intimidating or clearly irrelevant way;
- illegal drug use, dealing or drug paraphernalia as the focus;
- a phone number, email address, exact residential/business street address, or clearly scannable QR code/contact card intended to move contact off-platform;
- bank/card/account details, passports, driving licences, identity documents or other sensitive personal documents;
- obvious spam, advertising unrelated to the user's trade/business, memes, or content clearly unrelated to property/trade work.

Do NOT block ordinary construction tools, kitchens/bathrooms, building damage, people in normal workwear, company branding without contact details, ordinary vans, normal family/property photos incidentally containing people, or legitimate construction hazards.

If visible text is too small or unclear to confidently identify as contact/sensitive information, do not invent it. Return JSON only.`,
        },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      },
    });
  } catch {
    // If the provider itself refuses to process a harmful image, fail closed.
    throw new HttpError(422, 'This photo could not pass BuildPair\'s safety check. Choose a different image.');
  }

  const raw = response.text?.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
  if (!raw) throw new HttpError(422, 'This photo could not pass BuildPair\'s safety check. Choose a different image.');

  let result: z.infer<typeof moderationSchema>;
  try {
    result = moderationSchema.parse(JSON.parse(raw));
  } catch {
    throw new HttpError(503, 'Photo safety checking is temporarily unavailable. Please try again shortly.');
  }

  if (result.decision === 'block'
    || result.sexualOrNude
    || result.graphicViolence
    || result.hateOrExtremism
    || result.threateningOrWeaponFocused
    || result.illegalDrugContent
    || result.contactDetails
    || result.exactAddress
    || result.sensitiveDocumentOrFinancialInfo
    || result.spamOrClearlyIrrelevant) {
    throw new HttpError(422, safeBlockReason(result));
  }

  return result.reason || 'Passed automated BuildPair photo safety check';
}

async function uploadToCloudinary(input: { bytes: Buffer; mimeType: string; kind: MediaKind }) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || DEFAULT_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!apiKey || !apiSecret) throw new Error('Cloudinary is not configured');

  const publicId = `${MEDIA_FOLDERS[input.kind]}/${randomUUID()}`;
  const form = new FormData();
  form.append('file', new Blob([input.bytes], { type: input.mimeType }), 'buildpair-upload');
  form.append('public_id', publicId);
  form.append('asset_folder', MEDIA_FOLDERS[input.kind]);
  form.append('overwrite', 'false');
  // Incoming transformation caps huge dimensions and removes EXIF/GPS/XMP metadata
  // before Cloudinary stores the approved original.
  form.append('transformation', 'c_limit,w_3000,h_3000,fl_force_strip/q_auto:good');

  const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    headers: { Authorization: `Basic ${authorization}` },
    body: form,
  });
  const body = await response.json() as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !body.secure_url) {
    throw new Error(body.error?.message || 'Image storage failed');
  }
  return { url: body.secure_url, publicId: body.public_id || publicId };
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    await assertRateLimit(request, 'media-upload-hour', 60, 3600, userId);
    await assertRateLimit(request, 'media-upload-day', 150, 86400, userId);

    const form = await request.formData();
    const kind = uploadKind(form.get('kind'));
    if (kind === 'trader' && !modes.traderEnabled) throw new HttpError(403, 'Tradesperson account required');
    if (kind === 'job' && !modes.customerEnabled) throw new HttpError(403, 'Homeowner account required');

    const entry = form.get('file');
    if (!(entry instanceof File)) throw new HttpError(400, 'Choose an image to upload');
    if (!ALLOWED_MIME_TYPES.has(entry.type)) {
      throw new HttpError(400, 'BuildPair accepts JPG, PNG and WebP photos.');
    }
    if (entry.size <= 0 || entry.size > MAX_IMAGE_BYTES) {
      throw new HttpError(400, 'Choose an image smaller than 10 MB.');
    }

    const bytes = Buffer.from(await entry.arrayBuffer());
    const moderationReason = await moderateImage({ bytes, mimeType: entry.type, kind });
    const stored = await uploadToCloudinary({ bytes, mimeType: entry.type, kind });
    await recordApprovedMedia({
      userId,
      kind,
      url: stored.url,
      publicId: stored.publicId,
      reason: moderationReason,
    });

    return Response.json({ url: stored.url });
  } catch (error) {
    return jsonError(error);
  }
}
