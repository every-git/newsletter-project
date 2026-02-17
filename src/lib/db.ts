import type { Article, ArticleWithBookmark, Digest, ArticleStatus } from './types';

type D1Database = import('@cloudflare/workers-types').D1Database;

export async function getLatestDigest(db: D1Database): Promise<Digest | null> {
  const result = await db
    .prepare('SELECT * FROM digests ORDER BY created_at DESC LIMIT 1')
    .first<Digest>();
  return result;
}

export async function getDigestById(db: D1Database, id: string): Promise<Digest | null> {
  return db.prepare('SELECT * FROM digests WHERE id = ?').bind(id).first<Digest>();
}

export async function getDigestsByDate(db: D1Database, date: string): Promise<Digest[]> {
  const result = await db
    .prepare('SELECT * FROM digests WHERE date = ? ORDER BY edition DESC')
    .bind(date)
    .all<Digest>();
  return result.results;
}

export async function getArticlesByIds(db: D1Database, ids: string[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await db
    .prepare(`SELECT * FROM articles WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<Article>();
  // Maintain order of ids
  const map = new Map(result.results.map((a) => [a.id, a]));
  return ids.map((id) => map.get(id)).filter((a): a is Article => !!a);
}

export async function getArticles(
  db: D1Database,
  options: {
    feed_type?: string;
    status?: ArticleStatus;
    tag?: string;
    search?: string;
    sort?: 'latest' | 'score';
    limit?: number;
    offset?: number;
  } = {}
): Promise<Article[]> {
  const { feed_type, status = 'active', tag, search, sort = 'latest', limit = 30, offset = 0 } = options;
  const conditions: string[] = ['status = ?'];
  const params: (string | number)[] = [status];

  if (feed_type) {
    conditions.push('feed_type = ?');
    params.push(feed_type);
  }
  if (tag) {
    conditions.push("tags LIKE '%' || ? || '%'");
    params.push(`"${tag}"`);
  }
  if (search) {
    conditions.push('(title LIKE ? OR summary_ko LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const orderBy = sort === 'score' ? 'score_final DESC' : 'published_at DESC';
  const sql = `SELECT * FROM articles WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all<Article>();
  return result.results;
}

export async function getArticlesWithBookmarks(
  db: D1Database,
  options: Parameters<typeof getArticles>[1] = {}
): Promise<ArticleWithBookmark[]> {
  const articles = await getArticles(db, options);
  if (articles.length === 0) return [];
  const ids = articles.map((a) => a.id);
  const placeholders = ids.map(() => '?').join(',');
  const bookmarks = await db
    .prepare(`SELECT article_id FROM bookmarks WHERE article_id IN (${placeholders})`)
    .bind(...ids)
    .all<{ article_id: string }>();
  const bookmarkedSet = new Set(bookmarks.results.map((b) => b.article_id));
  return articles.map((a) => ({ ...a, is_bookmarked: bookmarkedSet.has(a.id) }));
}

export async function getArticleById(db: D1Database, id: string): Promise<ArticleWithBookmark | null> {
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first<Article>();
  if (!article) return null;
  const bookmark = await db
    .prepare('SELECT 1 FROM bookmarks WHERE article_id = ?')
    .bind(id)
    .first();
  return { ...article, is_bookmarked: !!bookmark };
}

export async function updateArticleStatus(
  db: D1Database,
  id: string,
  status: ArticleStatus
): Promise<boolean> {
  const archivedAt = status === 'archived' ? new Date().toISOString() : null;
  const result = await db
    .prepare('UPDATE articles SET status = ?, archived_at = COALESCE(?, archived_at) WHERE id = ?')
    .bind(status, archivedAt, id)
    .run();
  return result.meta.changes > 0;
}

export async function toggleBookmark(db: D1Database, articleId: string): Promise<boolean> {
  const existing = await db
    .prepare('SELECT 1 FROM bookmarks WHERE article_id = ?')
    .bind(articleId)
    .first();
  if (existing) {
    await db.prepare('DELETE FROM bookmarks WHERE article_id = ?').bind(articleId).run();
    return false;
  } else {
    await db
      .prepare('INSERT INTO bookmarks (article_id, created_at) VALUES (?, ?)')
      .bind(articleId, new Date().toISOString())
      .run();
    return true;
  }
}

export async function getBookmarkedArticles(db: D1Database): Promise<ArticleWithBookmark[]> {
  const result = await db
    .prepare(
      'SELECT a.* FROM articles a INNER JOIN bookmarks b ON a.id = b.article_id ORDER BY b.created_at DESC'
    )
    .all<Article>();
  return result.results.map((a) => ({ ...a, is_bookmarked: true }));
}

export async function getRelatedArticles(
  db: D1Database,
  article: Article,
  limit = 3
): Promise<Article[]> {
  const tags: string[] = JSON.parse(article.tags || '[]');
  if (tags.length === 0) {
    return db
      .prepare(
        "SELECT * FROM articles WHERE id != ? AND feed_type = ? AND status = 'active' ORDER BY published_at DESC LIMIT ?"
      )
      .bind(article.id, article.feed_type, limit)
      .all<Article>()
      .then((r) => r.results);
  }
  const tagConditions = tags.map(() => "tags LIKE '%' || ? || '%'").join(' OR ');
  return db
    .prepare(
      `SELECT * FROM articles WHERE id != ? AND status = 'active' AND (${tagConditions}) ORDER BY score_final DESC LIMIT ?`
    )
    .bind(article.id, ...tags.map((t) => `"${t}"`), limit)
    .all<Article>()
    .then((r) => r.results);
}

export async function getRecentDigests(db: D1Database, limit = 10): Promise<Digest[]> {
  const result = await db
    .prepare('SELECT * FROM digests ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all<Digest>();
  return result.results;
}
