import { aiDailyLimit } from '@/lib/ai-audit';
import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

type Audience = 'homeowner' | 'tradesperson' | 'public';

type AiLogRow = {
  id: number;
  userId: string | null;
  userEmail: string | null;
  requestText: string;
  responseText: string | null;
  status: string;
  providerCalled: boolean;
  latencyMs: number | null;
  createdAt: string;
};

type ParsedRequest = {
  conversationId?: string;
  pathname?: string;
  audience?: Audience;
  messages?: { role?: string; content?: string }[];
};

type ParsedResponse = { reply?: string; source?: string };

type ConversationTurn = {
  id: number;
  asked: string;
  answer: string;
  status: string;
  providerCalled: boolean;
  latencyMs: number | null;
  createdAt: string;
  unanswered: boolean;
};

type Conversation = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  audience: Audience;
  pathname: string;
  pageLabel: string;
  firstAt: string;
  lastAt: string;
  anonymous: boolean;
  hasError: boolean;
  unanswered: boolean;
  turns: ConversationTurn[];
};

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

function pageLabel(pathname: string) {
  const path = pathname.toLowerCase();
  if (path === '/' || path === '') return 'Home page';
  if (path.includes('/customer/new-job')) return 'Post a job';
  if (path.includes('/customer/compare')) return 'Compare quotes';
  if (path.includes('/customer/jobs')) return 'Homeowner jobs';
  if (path.includes('/customer/messages')) return 'Homeowner messages';
  if (path.includes('/customer/profile')) return 'Homeowner profile';
  if (path.includes('/customer/saved-trades')) return 'Saved trades';
  if (path.includes('/customer/dashboard')) return 'Homeowner dashboard';
  if (path.includes('/trader/job-board')) return 'Job board';
  if (path.includes('/trader/my-jobs') || path.includes('/trader/jobs')) return 'Tradesperson jobs';
  if (path.includes('/trader/quotes')) return 'Quotes';
  if (path.includes('/trader/invoices')) return 'Invoices';
  if (path.includes('/trader/messages')) return 'Tradesperson messages';
  if (path.includes('/trader/profile')) return 'Tradesperson profile';
  if (path.includes('/trader/analytics')) return 'Analytics';
  if (path.includes('/trader/google-reviews')) return 'Google Reviews';
  if (path.includes('/trader/saved-searches')) return 'Saved searches';
  if (path.includes('/trader/dashboard')) return 'Tradesperson dashboard';
  if (path.includes('/directory')) return 'Trades directory';
  if (path.includes('/for-homeowners')) return 'For homeowners';
  if (path.includes('/for-tradespeople')) return 'For tradespeople';
  if (path.includes('/how-it-works')) return 'How it works';
  if (path.includes('/advice')) return 'Advice';
  if (path.includes('/building-regulations')) return 'Building regulations';
  if (path.includes('/contact')) return 'Contact';
  return pathname || 'BuildPair';
}

function latestUserMessage(messages: ParsedRequest['messages']) {
  if (!messages?.length) return '';
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user' && typeof message.content === 'string') return message.content.trim();
  }
  return '';
}

function answerFromResponse(value: string | null) {
  const parsed = parseJson<ParsedResponse>(value);
  if (parsed?.reply?.trim()) return parsed.reply.trim();
  return value?.trim() ?? '';
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const sql = getSql();
    const [rows, usage] = await Promise.all([
      sql`
        SELECT
          a.id,
          a.user_id AS "userId",
          u.email AS "userEmail",
          a.request_text AS "requestText",
          a.response_text AS "responseText",
          a.status,
          a.provider_called AS "providerCalled",
          a.latency_ms AS "latencyMs",
          a.created_at AS "createdAt"
        FROM ai_request_logs a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.endpoint = 'site-helper'
        ORDER BY a.created_at DESC
        LIMIT 250
      ` as Promise<AiLogRow[]>,
      sql`
        SELECT
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND endpoint = 'site-helper')::int AS "requests24h",
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND endpoint = 'site-helper' AND status = 'error')::int AS "errors24h",
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND endpoint = 'site-helper' AND status <> 'success')::int AS "unanswered24h"
        FROM ai_request_logs
      ` as Promise<{ requests24h: number; errors24h: number; unanswered24h: number }[]>,
    ]);

    const conversations = new Map<string, Conversation>();

    for (const row of [...rows].reverse()) {
      const parsed = parseJson<ParsedRequest>(row.requestText) ?? {};
      const asked = latestUserMessage(parsed.messages);
      if (!asked) continue;

      const audience: Audience = parsed.audience === 'homeowner' || parsed.audience === 'tradesperson' ? parsed.audience : 'public';
      const pathname = typeof parsed.pathname === 'string' && parsed.pathname.trim() ? parsed.pathname.trim() : '/';
      const conversationId = typeof parsed.conversationId === 'string' && parsed.conversationId.trim()
        ? parsed.conversationId.trim()
        : `legacy-${row.id}`;
      const answer = answerFromResponse(row.responseText);
      const unanswered = row.status !== 'success' || !answer;
      const turn: ConversationTurn = {
        id: row.id,
        asked,
        answer,
        status: row.status,
        providerCalled: row.providerCalled,
        latencyMs: row.latencyMs,
        createdAt: row.createdAt,
        unanswered,
      };

      const current = conversations.get(conversationId);
      if (!current) {
        conversations.set(conversationId, {
          id: conversationId,
          userId: row.userId,
          userEmail: row.userEmail,
          audience,
          pathname,
          pageLabel: pageLabel(pathname),
          firstAt: row.createdAt,
          lastAt: row.createdAt,
          anonymous: !row.userId,
          hasError: row.status === 'error',
          unanswered,
          turns: [turn],
        });
        continue;
      }

      current.userId = row.userId ?? current.userId;
      current.userEmail = row.userEmail ?? current.userEmail;
      current.audience = audience;
      current.pathname = pathname;
      current.pageLabel = pageLabel(pathname);
      current.lastAt = row.createdAt;
      current.anonymous = !current.userId;
      current.hasError = current.hasError || row.status === 'error';
      current.unanswered = unanswered;
      current.turns.push(turn);
    }

    const list = [...conversations.values()]
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      .slice(0, 100);

    return Response.json({
      conversations: list,
      usage24h: usage[0] ?? { requests24h: 0, errors24h: 0, unanswered24h: 0 },
      globalDailyLimit: aiDailyLimit(),
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
