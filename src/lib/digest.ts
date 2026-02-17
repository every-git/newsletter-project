import type { D1Database } from '@cloudflare/workers-types';
import { callOpenRouter, getOpenRouterDailyCount, getOpenRouterDailyLimit, OPENROUTER_CHUNK_SIZE } from './llm/openrouter';
import { buildTechPrompt, buildWorldPrompt } from './llm/prompts';
import { calculateFinalScore } from './scoring';

export interface DigestArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  feed_type: string;
  score_community: number;
  published_at: string;
}

function parseJsonResponse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function processTechArticles(
  db: D1Database,
  articles: DigestArticle[],
  apiKey: string,
  kv: KVNamespace | null = null
): Promise<{ processed: number; failed: number }> {
  if (articles.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const chunkSize = OPENROUTER_CHUNK_SIZE;

  for (let i = 0; i < articles.length; i += chunkSize) {
    // rpm 제한 대응: 첫 청크 제외 3초 대기
    if (i > 0) await sleep(3000);

    const chunk = articles.slice(i, i + chunkSize);
    const prompt = buildTechPrompt(
      chunk.map((a) => ({ id: a.id, title: a.title, source: a.source, url: a.url }))
    );

    try {
      const response = await callOpenRouter(
        apiKey,
        [
          { role: 'system', content: '당신은 기술 뉴스 분석 전문가입니다. 반드시 유효한 JSON만 반환하세요.' },
          { role: 'user', content: prompt },
        ],
        0,
        kv
      );

      let results: any[];
      try {
        results = parseJsonResponse(response);
      } catch {
        const retry = await callOpenRouter(
          apiKey,
          [
            { role: 'system', content: '반드시 유효한 JSON 배열만 반환하세요. 다른 텍스트 없이 JSON만.' },
            { role: 'user', content: prompt },
          ],
          0,
          kv
        );
        results = parseJsonResponse(retry);
      }

      for (const result of results) {
        const article = chunk.find((a) => a.id === result.id);
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
      processed += chunk.length;
    } catch (e) {
      console.error(`Chunk ${i / chunkSize + 1} failed:`, e);
      failed += chunk.length;
    }
  }

  return { processed, failed };
}

export async function processWorldArticles(
  db: D1Database,
  articles: DigestArticle[],
  apiKey: string,
  kv: KVNamespace | null = null
): Promise<string> {
  if (articles.length === 0) return '세계 뉴스가 아직 수집되지 않았습니다.';

  const prompt = buildWorldPrompt(
    articles.map((a) => ({ id: a.id, title: a.title, source: a.source, url: a.url }))
  );

  const response = await callOpenRouter(
    apiKey,
    [
      { role: 'system', content: '당신은 국제 뉴스 분석 전문가입니다. 반드시 유효한 JSON만 반환하세요.' },
      { role: 'user', content: prompt },
    ],
    0,
    kv
  );

  let result: any;
  try {
    result = parseJsonResponse(response);
  } catch {
    const retry = await callOpenRouter(
      apiKey,
      [
        { role: 'system', content: '반드시 유효한 JSON만 반환하세요. 다른 텍스트 없이 JSON만.' },
        { role: 'user', content: prompt },
      ],
      0,
      kv
    );
    result = parseJsonResponse(retry);
  }

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

export async function createDigest(
  db: D1Database,
  kv: KVNamespace,
  edition: 'am' | 'pm',
  worldSummary: string
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const digestId = `${dateStr}-${edition}`;

  const techArticles = await db
    .prepare(
      `SELECT * FROM articles WHERE feed_type = 'tech' AND status = 'active' AND summary_ko IS NOT NULL
       ORDER BY score_final DESC LIMIT 7`
    )
    .all<DigestArticle>();

  const worldArticles = await db
    .prepare(
      `SELECT * FROM articles WHERE feed_type = 'world' AND status = 'active' AND summary_ko IS NOT NULL
       ORDER BY score_final DESC LIMIT 3`
    )
    .all<DigestArticle>();

  const techTopIds = techArticles.results.map((a) => a.id);
  const worldTopIds = worldArticles.results.map((a) => a.id);

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
      worldSummary,
      JSON.stringify(worldTopIds),
      JSON.stringify(categories),
      now.toISOString()
    )
    .run();

  const digestData = await db
    .prepare('SELECT * FROM digests WHERE id = ?')
    .bind(digestId)
    .first();

  if (digestData) {
    await kv.put('digest-latest', JSON.stringify(digestData), { expirationTtl: 86400 });
  }

  return digestId;
}

export { getOpenRouterDailyCount, getOpenRouterDailyLimit } from './llm/openrouter';
