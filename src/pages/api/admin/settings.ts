import type { APIRoute } from 'astro';
import { getOpenRouterDailyLimit, setOpenRouterDailyLimit } from '../../../lib/llm/openrouter';

export const GET: APIRoute = async ({ locals }) => {
  const runtime = (locals as any).runtime;
  const kv = runtime?.env?.KV || null;

  const openrouterDailyLimit = await getOpenRouterDailyLimit(kv);

  return new Response(
    JSON.stringify({ openrouter_daily_limit: openrouterDailyLimit }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.KV) {
    return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  }

  const kv = runtime.env.KV;

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (typeof body.openrouter_daily_limit === 'number') {
      const limit = Math.max(1, Math.min(10000, Math.floor(body.openrouter_daily_limit)));
      await setOpenRouterDailyLimit(kv, limit);
      updates.openrouter_daily_limit = limit;
    }

    return new Response(
      JSON.stringify({ ok: true, updated: updates }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};
