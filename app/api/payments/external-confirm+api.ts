import { jsonError, HttpError, requireRole } from '@/lib/server';

export async function POST(request: Request) {
  try {
    await requireRole(request, 'customer');
    throw new HttpError(410, 'This legacy payment confirmation route is no longer used. Choose Private payment arrangement on the job instead; private payments are not marked as BuildPair-paid stages.');
  } catch (error) {
    return jsonError(error);
  }
}
