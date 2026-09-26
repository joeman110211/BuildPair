import { jsonError, requireRole } from '@/lib/server';
import { loadTraderCalendar } from '@/lib/trader-calendar';

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    return Response.json(await loadTraderCalendar(trader.id));
  } catch (error) {
    return jsonError(error);
  }
}
