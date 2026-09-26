import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { assertAiDailyBudget, recordAiRequest } from '@/lib/ai-audit';
import { uploadGeneratedImage } from '@/lib/cloudinary-server';
import { consumeProjectPlusImage, projectPlusEntitlement, projectPlusUsage } from '@/lib/project-plus';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  roomType: z.string().trim().min(2).max(80),
  brief: z.string().trim().min(10).max(3000),
  style: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const entitlement = await projectPlusEntitlement(userId);
    if (!entitlement.active) throw new HttpError(402, 'BuildPair Project+ is required for AI room concepts. It is included with BuildPair Pro.');
    const usage = await projectPlusUsage(userId);
    if (usage.imagesUsed >= entitlement.imageLimit) throw new HttpError(429, 'You have used this month’s Project+ room concept allowance.');
    const input = schema.parse(await request.json());
    await assertAiDailyBudget();
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new HttpError(503, 'AI room concepts are temporarily unavailable.');
    const model = process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image';
    const startedAt = Date.now();
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model,
      contents: `Create one realistic interior-design concept image for a UK ${input.roomType}. User brief: ${input.brief}. Style: ${input.style || 'practical contemporary'}. This is inspiration only, not a construction drawing. Do not add dimensions, prices, brand logos, contact information, people, signatures or safety/approval claims. Make the space believable and buildable-looking without claiming technical feasibility.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => Boolean((part as { inlineData?: { data?: string } }).inlineData?.data)) as { inlineData?: { data?: string; mimeType?: string } } | undefined;
    const encoded = imagePart?.inlineData?.data;
    if (!encoded) throw new Error('Project+ did not return an image');
    const mimeType = imagePart.inlineData?.mimeType || 'image/png';
    const url = await uploadGeneratedImage(Buffer.from(encoded, 'base64'), mimeType);
    await consumeProjectPlusImage(userId);
    const rows = await getSql()`
      INSERT INTO project_plus_designs(user_id, room_type, title, prompt, image_url)
      VALUES (${userId}, ${input.roomType}, ${input.roomType + ' concept'}, ${input.brief}, ${url})
      RETURNING id
    ` as unknown as { id: string }[];
    await recordAiRequest({ userId, endpoint: 'project-plus-room-concept', request: input, response: { imageUrl: url }, status: 'success', model, providerCalled: true, latencyMs: Date.now() - startedAt });
    return Response.json({ id: rows[0]?.id, imageUrl: url });
  } catch (error) { return jsonError(error); }
}
