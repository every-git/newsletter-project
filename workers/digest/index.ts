import {
  createDigest,
  processTechArticles,
  processWorldArticles,
} from '../../src/lib/digest';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  OPENROUTER_API_KEY: string;
}

interface ArticleRow {
  id: string;
  title: string;
  source: string;
  url: string;
  feed_type: string;
  score_community: number;
  published_at: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = env.DB;
    const kv = env.KV;
    const hour = new Date().getUTCHours();
    const edition: 'am' | 'pm' = hour < 12 ? 'am' : 'pm';

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const techArticles = await db
      .prepare(
        `SELECT id, title, source, url, feed_type, score_community, published_at
         FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NULL AND collected_at > ?
         ORDER BY score_community DESC LIMIT 25`
      )
      .bind(twelveHoursAgo)
      .all<ArticleRow>();

    const worldArticles = await db
      .prepare(
        `SELECT id, title, source, url, feed_type, score_community, published_at
         FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NULL AND collected_at > ?
         ORDER BY collected_at DESC LIMIT 15`
      )
      .bind(twelveHoursAgo)
      .all<ArticleRow>();

    let worldSummary = '세계 뉴스가 아직 수집되지 않았습니다.';

    if (env.OPENROUTER_API_KEY) {
      try {
        await processTechArticles(db, techArticles.results, env.OPENROUTER_API_KEY, kv);
      } catch (e: any) {
        console.error('Tech LLM processing failed:', e.message);
      }

      try {
        worldSummary = await processWorldArticles(
          db,
          worldArticles.results,
          env.OPENROUTER_API_KEY,
          kv
        );
      } catch (e: any) {
        console.error('World LLM processing failed:', e.message);
      }
    }

    const digestId = await createDigest(db, kv, edition, worldSummary);
    console.log(`Digest created: ${digestId}`);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/trigger') {
      const db = env.DB;
      const kv = env.KV;
      const edition = (url.searchParams.get('edition') as 'am' | 'pm') || 'pm';

      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      const techArticles = await db
        .prepare(
          `SELECT id, title, source, url, feed_type, score_community, published_at
           FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NULL
           ORDER BY score_community DESC LIMIT 25`
        )
        .all<ArticleRow>();

      const worldArticles = await db
        .prepare(
          `SELECT id, title, source, url, feed_type, score_community, published_at
           FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NULL
           ORDER BY collected_at DESC LIMIT 15`
        )
        .all<ArticleRow>();

      const results: Record<string, unknown> = {
        tech_count: techArticles.results.length,
        world_count: worldArticles.results.length,
      };

      let worldSummary = '세계 뉴스가 아직 수집되지 않았습니다.';

      if (env.OPENROUTER_API_KEY) {
        try {
          await processTechArticles(db, techArticles.results, env.OPENROUTER_API_KEY, kv);
          results.tech_processed = true;
        } catch (e: any) {
          results.tech_error = e.message;
        }

        try {
          worldSummary = await processWorldArticles(
            db,
            worldArticles.results,
            env.OPENROUTER_API_KEY,
            kv
          );
          results.world_summary = worldSummary;
        } catch (e: any) {
          results.world_error = e.message;
          worldSummary = '세계 뉴스 요약 생성 실패';
        }
      } else {
        results.warning = 'No OPENROUTER_API_KEY set';
      }

      const digestId = await createDigest(db, kv, edition, worldSummary);
      results.digest_id = digestId;

      return new Response(JSON.stringify(results, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Digest Worker', { status: 200 });
  },
};
