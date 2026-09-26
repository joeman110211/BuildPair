import { randomUUID } from 'node:crypto';

const DEFAULT_CLOUDINARY_CLOUD_NAME = 'qrrcn7ma';

export async function uploadGeneratedImage(bytes: Buffer, mimeType = 'image/png') {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || DEFAULT_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!apiKey || !apiSecret) throw new Error('Cloudinary is not configured');
  const publicId = `buildpair/project-plus/${randomUUID()}`;
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mimeType }), 'buildpair-project-plus.png');
  form.append('public_id', publicId);
  form.append('asset_folder', 'buildpair/project-plus');
  form.append('overwrite', 'false');
  form.append('transformation', 'c_limit,w_2048,h_2048,fl_force_strip/q_auto:good');
  const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    headers: { Authorization: `Basic ${authorization}` },
    body: form,
  });
  const body = await response.json() as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !body.secure_url) throw new Error(body.error?.message || 'Generated image storage failed');
  return body.secure_url;
}
