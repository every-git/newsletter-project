import { fetchHackerNews } from './sources/hackernews';
import { fetchRSS, type CollectedArticle } from './sources/rss-generic';
import { SOURCES } from './sources/sources-config';

type D1Database = import('@cloudflare/workers-types').D1Database;

const EXCLUDE_TECH_EN =
  /\b(nfl|nba|mlb|fifa|soccer|basketball|football|baseball|cricket|tennis|golf|olympics|super\s*bowl|kardashian|celebrity|gossip|reality\s*tv|movie\s*review|box\s*office|grammy|oscar|emmy|red\s*carpet)\b/i;

const EXCLUDE_WORLD_EN =
  /\b(premier\s*league|champions\s*league|world\s*cup|transfer|match\s*report|goal\s*scored|k-?pop|idol|drama\s*review|entertainment|billboard|grammy)\b/i;

const EXCLUDE_KO =
  /연예|아이돌|드라마|예능|스포츠|축구|야구|농구|배구|골프|올림픽|프로야구|K리그|해외축구/;

export function isRelevantArticle(title: string, feedType: string): boolean {
  if (EXCLUDE_KO.test(title)) return false;
  if (feedType === 'tech' && EXCLUDE_TECH_EN.test(title)) return false;
  if (feedType === 'world' && EXCLUDE_WORLD_EN.test(title)) return false;
  return true;
}

const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = new Uint8Array(21);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 21; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export async function insertArticles(
  db: D1Database,
  articles: CollectedArticle[]
): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  let duplicates = 0;

  for (const article of articles) {
    // 48시간 이전 기사 제외
    if (article.published_at && Date.now() - new Date(article.published_at).getTime() > MAX_AGE_MS) {
      continue;
    }

    // 제목 키워드 필터
    if (!isRelevantArticle(article.title, article.feed_type)) {
      continue;
    }

    const urlHash = await hashUrl(article.url);

    const existing = await db
      .prepare('SELECT id, score_community FROM articles WHERE url_hash = ?')
      .bind(urlHash)
      .first<{ id: string; score_community: number }>();

    if (existing) {
      duplicates++;
      if (article.score_community > existing.score_community) {
        await db
          .prepare('UPDATE articles SET score_community = ? WHERE id = ?')
          .bind(article.score_community, existing.id)
          .run();
      }
      continue;
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO articles (id, url, url_hash, title, source, feed_type, status, tags, score_community, published_at, collected_at, thumbnail_url)
         VALUES (?, ?, ?, ?, ?, ?, 'active', '[]', ?, ?, ?, ?)`
      )
      .bind(
        id,
        article.url,
        urlHash,
        article.title,
        article.source,
        article.feed_type,
        article.score_community,
        article.published_at,
        now,
        article.thumbnail_url
      )
      .run();

    inserted++;
  }

  return { inserted, duplicates };
}

export async function logCollection(
  db: D1Database,
  source: string,
  collected: number,
  duplicates: number,
  error?: string
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO collect_logs (source, collected_count, duplicate_count, error_message, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(source, collected, duplicates, error || null, new Date().toISOString())
    .run();
}

export async function cleanupDeleted(db: D1Database): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("DELETE FROM articles WHERE status = 'deleted' AND archived_at < ?")
    .bind(thirtyDaysAgo)
    .run();
}

export interface CollectResult {
  [sourceId: string]: { inserted: number; duplicates: number } | { error: string };
}

export async function runCollect(
  db: D1Database,
  sourceIds?: string[]
): Promise<CollectResult> {
  const targets = sourceIds
    ? SOURCES.filter((s) => sourceIds.includes(s.id) && s.type !== 'scrape')
    : SOURCES.filter((s) => s.type !== 'scrape');

  const results: CollectResult = {};

  for (const source of targets) {
    try {
      let articles: CollectedArticle[];
      if (source.type === 'api' && source.id === 'hackernews') {
        articles = await fetchHackerNews(30);
      } else {
        articles = await fetchRSS(source, 20);
      }
      const { inserted, duplicates } = await insertArticles(db, articles);
      await logCollection(db, source.id, inserted, duplicates);
      results[source.id] = { inserted, duplicates };
    } catch (error: any) {
      results[source.id] = { error: error.message };
      await logCollection(db, source.id, 0, 0, error.message);
    }
  }

  await cleanupDeleted(db);
  return results;
}

export { SOURCES } from './sources/sources-config';
