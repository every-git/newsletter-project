import type { APIRoute } from 'astro';
import { getOpenRouterDailyCount, getOpenRouterDailyLimit } from '../../../lib/digest';

export const GET: APIRoute = async ({ locals }) => {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.DB) {
    return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });
  }

  const db = runtime.env.DB;
  const kv = runtime.env.KV || null;

  try {
    const [totalRow, unsummarizedRow, todayLogs, latestDigest, openrouterCount, openrouterLimit, articlesBySource] =
      await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM articles').first<{ c: number }>(),
        db
          .prepare(
            "SELECT COUNT(*) as c FROM articles WHERE status = 'active' AND summary_ko IS NULL"
          )
          .first<{ c: number }>(),
        db
          .prepare(
            `SELECT source, collected_count, duplicate_count, created_at FROM collect_logs
             ORDER BY created_at DESC LIMIT 20`
          )
          .all<{ source: string; collected_count: number; duplicate_count: number; created_at: string }>(),
        db
          .prepare('SELECT id FROM digests ORDER BY created_at DESC LIMIT 1')
          .first<{ id: string }>(),
        kv ? getOpenRouterDailyCount(kv) : Promise.resolve(0),
        kv ? getOpenRouterDailyLimit(kv) : Promise.resolve(50),
        db
          .prepare(
            `SELECT source, COUNT(*) as count FROM articles WHERE status = 'active' GROUP BY source ORDER BY count DESC`
          )
          .all<{ source: string; count: number }>(),
      ]);

    const today = new Date().toISOString().slice(0, 10);
    const todayCollected =
      todayLogs?.results?.filter((r) => r.created_at.startsWith(today))?.reduce((sum, r) => sum + r.collected_count, 0) ?? 0;

    return new Response(
      JSON.stringify({
        total_articles: totalRow?.c ?? 0,
        unsummarized: unsummarizedRow?.c ?? 0,
        today_collected: todayCollected,
        openrouter_calls_today: openrouterCount,
        openrouter_daily_limit: openrouterLimit,
        latest_digest: latestDigest?.id ?? null,
        recent_collect_logs: todayLogs?.results ?? [],
        articles_by_source: articlesBySource?.results ?? [],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
