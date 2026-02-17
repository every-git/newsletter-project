import { fetchHackerNews } from './sources/hackernews';
import { fetchRSS, type CollectedArticle } from './sources/rss-generic';
import { SOURCES } from './sources/sources-config';

interface Env {
  DB: D1Database;
}

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

async function insertArticles(db: D1Database, articles: CollectedArticle[]): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  let duplicates = 0;

  for (const article of articles) {
    const urlHash = await hashUrl(article.url);

    // Check duplicate
    const existing = await db
      .prepare('SELECT id, score_community FROM articles WHERE url_hash = ?')
      .bind(urlHash)
      .first<{ id: string; score_community: number }>();

    if (existing) {
      duplicates++;
      // Update community score if higher
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

async function logCollection(db: D1Database, source: string, collected: number, duplicates: number, error?: string) {
  await db
    .prepare(
      'INSERT INTO collect_logs (source, collected_count, duplicate_count, error_message, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(source, collected, duplicates, error || null, new Date().toISOString())
    .run();
}

async function cleanupDeleted(db: D1Database) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("DELETE FROM articles WHERE status = 'deleted' AND archived_at < ?")
    .bind(thirtyDaysAgo)
    .run();
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = env.DB;
    const now = new Date();
    const hour = now.getUTCHours();

    // Determine which sources to collect based on time
    const shouldCollect = (interval: string): boolean => {
      switch (interval) {
        case 'hourly':
          return true;
        case 'twice_daily':
          return hour === 19 || hour === 7; // ~04:00 KST, ~16:00 KST
        case 'daily':
          return hour === 19; // ~04:00 KST
        default:
          return false;
      }
    };

    const activeSources = SOURCES.filter((s) => s.type !== 'scrape' && shouldCollect(s.interval));

    for (const source of activeSources) {
      try {
        let articles: CollectedArticle[];

        if (source.type === 'api' && source.id === 'hackernews') {
          articles = await fetchHackerNews(30);
        } else {
          articles = await fetchRSS(source, 20);
        }

        const { inserted, duplicates } = await insertArticles(db, articles);
        await logCollection(db, source.id, inserted, duplicates);
        console.log(`[${source.id}] Collected: ${inserted}, Duplicates: ${duplicates}`);
      } catch (error: any) {
        console.error(`[${source.id}] Error:`, error.message);
        await logCollection(db, source.id, 0, 0, error.message);
      }
    }

    // Cleanup old deleted articles
    await cleanupDeleted(db);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // Manual trigger endpoint for testing
    const url = new URL(request.url);
    if (url.pathname === '/trigger') {
      const db = env.DB;
      const results: Record<string, any> = {};

      const activeSources = SOURCES.filter((s) => s.type !== 'scrape');

      for (const source of activeSources) {
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

      return new Response(JSON.stringify(results, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Collect Worker', { status: 200 });
  },
};
