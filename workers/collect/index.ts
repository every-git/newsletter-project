import { runCollect, SOURCES } from '../../src/lib/collect';
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
    const now = new Date();
    const hour = now.getUTCHours();

    // --- 1) 기사 수집 ---
    const shouldCollect = (interval: string): boolean => {
      switch (interval) {
        case 'hourly':
          return true;
        case 'twice_daily':
          return hour === 19 || hour === 7;
        case 'daily':
          return hour === 19;
        default:
          return false;
      }
    };

    const sourceIds = SOURCES.filter((s) => s.type !== 'scrape' && shouldCollect(s.interval)).map(
      (s) => s.id
    );

    const results = await runCollect(db, sourceIds.length ? sourceIds : undefined);
    for (const [id, r] of Object.entries(results)) {
      if ('inserted' in r) {
        console.log(`[${id}] Collected: ${r.inserted}, Duplicates: ${r.duplicates}`);
      } else {
        console.error(`[${id}] Error:`, r.error);
      }
    }

    // --- 2) LLM 처리 (수집 직후, 미처리 기사 대상) ---
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
        const techResult = await processTechArticles(db, techArticles.results, env.OPENROUTER_API_KEY, kv);
        console.log(`[digest] Tech processed: ${techResult.processed}, failed: ${techResult.failed}`);
      } catch (e: any) {
        console.error('[digest] Tech LLM processing failed:', e.message);
      }

      try {
        worldSummary = await processWorldArticles(db, worldArticles.results, env.OPENROUTER_API_KEY, kv);
        console.log('[digest] World articles processed');
      } catch (e: any) {
        console.error('[digest] World LLM processing failed:', e.message);
      }
    }

    // --- 3) 다이제스트 레코드 생성 ---
    const edition: 'am' | 'pm' = hour < 12 ? 'am' : 'pm';
    const digestId = await createDigest(db, kv, edition, worldSummary);
    console.log(`[digest] Created: ${digestId}`);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/trigger') {
      const db = env.DB;
      const kv = env.KV;
      const mode = url.searchParams.get('mode') || 'all'; // all | collect | digest | tech | world
      const output: Record<string, unknown> = {};

      // 수집
      if (mode === 'all' || mode === 'collect') {
        output.collect = await runCollect(db);
      }

      // LLM 처리
      if (mode !== 'collect') {
        const noTimeLimit = url.searchParams.has('all'); // ?all → 시간 제한 없이 전체 미처리
        const cutoff = noTimeLimit
          ? '2000-01-01T00:00:00.000Z'
          : new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        let worldSummary = '세계 뉴스가 아직 수집되지 않았습니다.';

        if (env.OPENROUTER_API_KEY && (mode === 'all' || mode === 'digest' || mode === 'tech')) {
          const techArticles = await db
            .prepare(
              `SELECT id, title, source, url, feed_type, score_community, published_at
               FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NULL AND collected_at > ?
               ORDER BY score_community DESC LIMIT 25`
            )
            .bind(cutoff)
            .all<ArticleRow>();
          output.tech_count = techArticles.results.length;

          try {
            await processTechArticles(db, techArticles.results, env.OPENROUTER_API_KEY, kv);
            output.tech_processed = true;
          } catch (e: any) {
            output.tech_error = e.message;
          }
        }

        if (env.OPENROUTER_API_KEY && (mode === 'all' || mode === 'digest' || mode === 'world')) {
          const worldArticles = await db
            .prepare(
              `SELECT id, title, source, url, feed_type, score_community, published_at
               FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NULL AND collected_at > ?
               ORDER BY collected_at DESC LIMIT 15`
            )
            .bind(cutoff)
            .all<ArticleRow>();
          output.world_count = worldArticles.results.length;

          try {
            worldSummary = await processWorldArticles(db, worldArticles.results, env.OPENROUTER_API_KEY, kv);
            output.world_summary = worldSummary;
          } catch (e: any) {
            output.world_error = e.message;
          }
        }

        const hour = new Date().getUTCHours();
        const edition: 'am' | 'pm' = hour < 12 ? 'am' : 'pm';
        const digestId = await createDigest(db, kv, edition, worldSummary);
        output.digest_id = digestId;
      }

      return new Response(JSON.stringify(output, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Collect + Digest Worker', { status: 200 });
  },
};
