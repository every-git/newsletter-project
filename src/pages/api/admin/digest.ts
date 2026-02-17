import type { APIRoute } from 'astro';
import {
  createDigest,
  processTechArticles,
  processWorldArticles,
  getOpenRouterDailyCount,
  getOpenRouterDailyLimit,
} from '../../../lib/digest';

interface ArticleRow {
  id: string;
  title: string;
  source: string;
  url: string;
  feed_type: string;
  score_community: number;
  published_at: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.DB || !runtime?.env?.KV) {
    return new Response(JSON.stringify({ error: 'DB or KV not available' }), { status: 500 });
  }

  const db = runtime.env.DB;
  const kv = runtime.env.KV;
  const apiKey = runtime.env.OPENROUTER_API_KEY || '';

  let edition: 'am' | 'pm' = new Date().getHours() < 12 ? 'am' : 'pm';
  let skipLlm = false;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.edition === 'am' || body.edition === 'pm') edition = body.edition;
    if (body.skip_llm === true) skipLlm = true;
  } catch {
    //
  }

  try {
    let tech_processed = 0;
    let tech_failed = 0;
    let world_processed = 0;
    let world_summary = '';

    if (skipLlm) {
      // LLM 호출 없이 이미 요약된 기사로 다이제스트만 생성
      world_summary = '';
      const existingWorld = await db
        .prepare(
          `SELECT id FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NOT NULL LIMIT 1`
        )
        .first<{ id: string }>();
      if (!existingWorld) {
        world_summary = '세계 뉴스가 아직 수집되지 않았습니다.';
      }
    } else {
      const techArticles = await db
        .prepare(
          `SELECT id, title, source, url, feed_type, score_community, published_at
           FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NULL
           AND collected_at > datetime('now', '-48 hours')
           ORDER BY score_community DESC LIMIT 25`
        )
        .all<ArticleRow>();

      const worldArticles = await db
        .prepare(
          `SELECT id, title, source, url, feed_type, score_community, published_at
           FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NULL
           AND collected_at > datetime('now', '-48 hours')
           ORDER BY collected_at DESC LIMIT 15`
        )
        .all<ArticleRow>();

      if (apiKey) {
        const [count, limit] = await Promise.all([
          getOpenRouterDailyCount(kv),
          getOpenRouterDailyLimit(kv),
        ]);
        if (count >= limit) {
          return new Response(
            JSON.stringify({
              error: `OpenRouter daily limit reached (${count}/${limit}). Try again tomorrow.`,
              openrouter_calls_today: count,
              openrouter_daily_limit: limit,
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const techResult = await processTechArticles(db, techArticles.results, apiKey, kv);
        tech_processed = techResult.processed;
        tech_failed = techResult.failed;

        world_summary = await processWorldArticles(db, worldArticles.results, apiKey, kv);
        world_processed = worldArticles.results.length;
      } else {
        world_summary = '세계 뉴스가 아직 수집되지 않았습니다.';
      }
    }

    const digest_id = await createDigest(db, kv, edition, world_summary);

    return new Response(
      JSON.stringify({
        tech_processed,
        tech_failed,
        world_processed,
        world_summary,
        digest_id,
        skip_llm: skipLlm,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
