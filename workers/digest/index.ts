import { callOpenRouter } from './openrouter';
import { buildTechPrompt, buildWorldPrompt } from './prompts';
import { calculateFinalScore } from '../../src/lib/scoring';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  OPENROUTER_API_KEY: string;
}

interface Article {
  id: string;
  title: string;
  source: string;
  url: string;
  feed_type: string;
  score_community: number;
  published_at: string;
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = new Uint8Array(21);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 21; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function parseJsonResponse(text: string): any {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

async function processTechArticles(db: D1Database, articles: Article[], apiKey: string) {
  if (articles.length === 0) return;

  const prompt = buildTechPrompt(
    articles.map((a) => ({ id: a.id, title: a.title, source: a.source, url: a.url }))
  );

  const response = await callOpenRouter(apiKey, [
    { role: 'system', content: '당신은 기술 뉴스 분석 전문가입니다. 반드시 유효한 JSON만 반환하세요.' },
    { role: 'user', content: prompt },
  ]);

  const results = parseJsonResponse(response);

  for (const result of results) {
    const article = articles.find((a) => a.id === result.id);
    if (!article) continue;

    const scoreLlm = Math.max(0, Math.min(100, result.score_llm || 0));
    const scoreFinal = calculateFinalScore(
      article.source,
      article.feed_type,
      article.score_community,
      scoreLlm,
      article.published_at
    );

    await db
      .prepare(
        `UPDATE articles SET summary_ko = ?, insight_ko = ?, tags = ?, score_llm = ?, score_final = ? WHERE id = ?`
      )
      .bind(
        result.summary_ko || null,
        result.insight_ko || null,
        JSON.stringify(result.tags || []),
        scoreLlm,
        scoreFinal,
        result.id
      )
      .run();
  }
}

async function processWorldArticles(
  db: D1Database,
  articles: Article[],
  apiKey: string
): Promise<string> {
  if (articles.length === 0) return '세계 뉴스가 아직 수집되지 않았습니다.';

  const prompt = buildWorldPrompt(
    articles.map((a) => ({ id: a.id, title: a.title, source: a.source, url: a.url }))
  );

  const response = await callOpenRouter(apiKey, [
    { role: 'system', content: '당신은 국제 뉴스 분석 전문가입니다. 반드시 유효한 JSON만 반환하세요.' },
    { role: 'user', content: prompt },
  ]);

  const result = parseJsonResponse(response);

  // Update individual articles
  if (result.articles) {
    for (const articleResult of result.articles) {
      const scoreLlm = Math.max(0, Math.min(100, articleResult.score_llm || 50));
      const article = articles.find((a) => a.id === articleResult.id);
      if (!article) continue;

      const scoreFinal = calculateFinalScore(
        article.source,
        article.feed_type,
        article.score_community,
        scoreLlm,
        article.published_at
      );

      await db
        .prepare(
          `UPDATE articles SET summary_ko = ?, score_llm = ?, score_final = ?, tags = '["world"]' WHERE id = ?`
        )
        .bind(articleResult.summary_ko || null, scoreLlm, scoreFinal, articleResult.id)
        .run();
    }
  }

  return result.world_summary || '';
}

async function createDigest(db: D1Database, kv: KVNamespace, edition: 'am' | 'pm') {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const digestId = `${dateStr}-${edition}`;

  // Get top tech articles by score
  const techArticles = await db
    .prepare(
      `SELECT * FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NOT NULL
       ORDER BY score_final DESC LIMIT 7`
    )
    .all<Article>();

  // Get top world articles by score
  const worldArticles = await db
    .prepare(
      `SELECT * FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NOT NULL
       ORDER BY score_final DESC LIMIT 3`
    )
    .all<Article>();

  // Get world summary from the latest processing
  const latestDigest = await db
    .prepare('SELECT world_summary_ko FROM digests WHERE date = ? ORDER BY created_at DESC LIMIT 1')
    .bind(dateStr)
    .first<{ world_summary_ko: string }>();

  const techTopIds = techArticles.results.map((a) => a.id);
  const worldTopIds = worldArticles.results.map((a) => a.id);

  // Build categories from tech articles with tags
  const allTaggedArticles = await db
    .prepare(
      `SELECT id, tags FROM articles WHERE feed_type = 'tech' AND status = 'active' AND tags != '[]'
       ORDER BY score_final DESC LIMIT 30`
    )
    .all<{ id: string; tags: string }>();

  const categories: Record<string, string[]> = {};
  for (const a of allTaggedArticles.results) {
    const tags: string[] = JSON.parse(a.tags);
    for (const tag of tags) {
      if (!categories[tag]) categories[tag] = [];
      if (categories[tag].length < 5) {
        categories[tag].push(a.id);
      }
    }
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO digests (id, date, edition, tech_top_ids, world_summary_ko, world_top_ids, categories, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      digestId,
      dateStr,
      edition,
      JSON.stringify(techTopIds),
      latestDigest?.world_summary_ko || '',
      JSON.stringify(worldTopIds),
      JSON.stringify(categories),
      now.toISOString()
    )
    .run();

  // Cache in KV
  const digestData = await db
    .prepare('SELECT * FROM digests WHERE id = ?')
    .bind(digestId)
    .first();

  if (digestData) {
    await kv.put('digest-latest', JSON.stringify(digestData), { expirationTtl: 86400 });
  }

  return digestId;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = env.DB;
    const kv = env.KV;

    // Determine edition based on cron time
    const hour = new Date().getUTCHours();
    const edition: 'am' | 'pm' = hour < 12 ? 'am' : 'pm';

    // Get recent unsummarized articles (last 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const techArticles = await db
      .prepare(
        `SELECT id, title, source, url, feed_type, score_community, published_at
         FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NULL AND collected_at > ?
         ORDER BY score_community DESC LIMIT 25`
      )
      .bind(twelveHoursAgo)
      .all<Article>();

    const worldArticles = await db
      .prepare(
        `SELECT id, title, source, url, feed_type, score_community, published_at
         FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NULL AND collected_at > ?
         ORDER BY collected_at DESC LIMIT 15`
      )
      .bind(twelveHoursAgo)
      .all<Article>();

    // Process with LLM (batch calls)
    if (env.OPENROUTER_API_KEY) {
      try {
        await processTechArticles(db, techArticles.results, env.OPENROUTER_API_KEY);
      } catch (e: any) {
        console.error('Tech LLM processing failed:', e.message);
      }

      try {
        const worldSummary = await processWorldArticles(db, worldArticles.results, env.OPENROUTER_API_KEY);
        // Store world summary temporarily for digest creation
        const dateStr = new Date().toISOString().slice(0, 10);
        const digestId = `${dateStr}-${edition}`;
        // We'll create the digest with this summary
      } catch (e: any) {
        console.error('World LLM processing failed:', e.message);
      }
    }

    // Create digest
    const digestId = await createDigest(db, kv, edition);
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
        .all<Article>();

      const worldArticles = await db
        .prepare(
          `SELECT id, title, source, url, feed_type, score_community, published_at
           FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NULL
           ORDER BY collected_at DESC LIMIT 15`
        )
        .all<Article>();

      const results: any = {
        tech_count: techArticles.results.length,
        world_count: worldArticles.results.length,
      };

      if (env.OPENROUTER_API_KEY) {
        try {
          await processTechArticles(db, techArticles.results, env.OPENROUTER_API_KEY);
          results.tech_processed = true;
        } catch (e: any) {
          results.tech_error = e.message;
        }

        try {
          const worldSummary = await processWorldArticles(db, worldArticles.results, env.OPENROUTER_API_KEY);
          results.world_summary = worldSummary;
        } catch (e: any) {
          results.world_error = e.message;
        }
      } else {
        results.warning = 'No OPENROUTER_API_KEY set';
      }

      const digestId = await createDigest(db, kv, edition);
      results.digest_id = digestId;

      return new Response(JSON.stringify(results, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Digest Worker', { status: 200 });
  },
};
