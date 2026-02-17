import type { APIRoute } from 'astro';
import { runCollect } from '../../../lib/collect';

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.DB) {
    return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });
  }

  const db = runtime.env.DB;
  let sourceIds: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.sources && Array.isArray(body.sources)) {
      sourceIds = body.sources;
    }
  } catch {
    // no body or invalid JSON
  }

  try {
    const results = await runCollect(db, sourceIds);
    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
