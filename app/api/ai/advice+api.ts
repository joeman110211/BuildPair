import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { assertAiDailyBudget, recordAiRequest } from '@/lib/ai-audit';
import { ALL_ADVICE_GUIDES, isOfficialAdviceSource, searchAllAdviceGuides } from '@/lib/advice-catalog';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError } from '@/lib/server';

const inputSchema = z.object({
  question: z.string().trim().min(3).max(1200),
  audience: z.enum(['homeowner', 'tradesperson', 'all']).default('all'),
});

function fallback(question: string, audience: 'homeowner' | 'tradesperson' | 'all') {
  const guides = searchAllAdviceGuides(question, audience).slice(0, 4);
  return {
    answer: guides.length
      ? 'I found BuildPair guidance that matches your question. Open the most relevant guide below for the checked detail and official sources.'
      : 'BuildPair does not have a checked guide that answers that reliably yet. Try a broader search or use the official-source links already available in the Advice Hub.',
    guideSlugs: guides.map((guide) => guide.slug),
    sources: guides.flatMap((guide) => guide.sources).filter(isOfficialAdviceSource).filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index),
    source: 'library' as const,
  };
}

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'ai-advice', 20, 3600);
    const input = inputSchema.parse(await request.json());
    const vagueQuestion = /^(cost|costs|price|prices|pricing|help|advice)$/i.test(input.question.trim());
    if (vagueQuestion) {
      return Response.json({
        answer: 'Tell me the job or trade you mean, for example “bathroom renovation cost”, “electrician day rate” or “builder deposit”. I’ll use BuildPair’s checked guidance to give you a useful answer.',
        guideSlugs: [],
        sources: [],
        source: 'library' as const,
      });
    }

    const matches = searchAllAdviceGuides(input.question, input.audience).slice(0, 4);
    const base = fallback(input.question, input.audience);
    const key = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
    const startedAt = Date.now();

    if (!key || !matches.length) {
      await recordAiRequest({
        userId: null,
        endpoint: 'advice',
        request: input,
        response: base,
        status: 'fallback',
        model,
        providerCalled: false,
        latencyMs: Date.now() - startedAt,
        metadata: { matchedGuides: matches.map((guide) => guide.slug) },
      });
      return Response.json(base);
    }

    try {
      await assertAiDailyBudget();
    } catch (error) {
      await recordAiRequest({
        userId: null,
        endpoint: 'advice',
        request: input,
        response: base,
        status: 'blocked',
        model,
        providerCalled: false,
        latencyMs: Date.now() - startedAt,
        metadata: { reason: error instanceof Error ? error.message : 'Global AI limit reached' },
      });
      return Response.json(base);
    }

    const evidence = matches.map((guide, index) => {
      const sections = guide.sections.map((section) => {
        const paragraphs = section.paragraphs ?? [];
        const bullets = section.bullets ?? [];
        return [section.heading, ...paragraphs, ...bullets].join('\n');
      }).join('\n');
      return [
        'GUIDE ' + (index + 1) + ': ' + guide.title,
        'Applies to: ' + guide.appliesTo,
        'Last checked: ' + guide.reviewedAt,
        'Key points: ' + guide.keyPoints.join(' | '),
        sections,
      ].join('\n');
    }).join('\n\n');

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model,
      contents: `You are BuildPair Advice AI. Answer a UK home-improvement question using ONLY the checked BuildPair guide evidence below.

Rules:
- Use clear British English.
- Do not invent law, prices, dates, rights, qualifications, standards or requirements.
- Distinguish legal requirements from recommendations or good practice.
- If the evidence does not answer an important part, say that plainly.
- Do not give unsafe electrical, gas, structural or other hazardous instructions.
- Do not call BuildPay escrow, insurance or a workmanship/refund guarantee.
- Keep the answer under 260 words.
- Do not include URLs. The product may show official source links separately.
- For legal or regulatory questions, remind the reader that the exact position can depend on location and facts.

Checked evidence:
<evidence>
${evidence}
</evidence>

Question:
<question>
${input.question}
</question>`,
      config: { temperature: 0.1, maxOutputTokens: 1200 },
    });

    const answer = response.text?.trim();
    if (!answer) return Response.json(base);

    const result = {
      answer,
      guideSlugs: matches.map((guide) => guide.slug),
      sources: matches.flatMap((guide) => guide.sources).filter(isOfficialAdviceSource).filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index),
      source: 'ai' as const,
    };

    await recordAiRequest({
      userId: null,
      endpoint: 'advice',
      request: input,
      response: result,
      status: 'success',
      model,
      providerCalled: true,
      latencyMs: Date.now() - startedAt,
      metadata: { matchedGuides: matches.map((guide) => guide.slug), librarySize: ALL_ADVICE_GUIDES.length },
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
