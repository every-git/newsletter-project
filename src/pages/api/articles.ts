import type { APIRoute } from 'astro';
import { getArticlesWithBookmarks } from '../../lib/db';
import type { ArticleStatus } from '../../lib/types';

export const GET: APIRoute = async ({ request, locals }) => {
  const { env } = (locals as any).runtime;
  const db = env.DB;
  const url = new URL(request.url);

  const feed_type = url.searchParams.get('feed') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const status = (url.searchParams.get('status') as ArticleStatus) || 'active';
  const sort = (url.searchParams.get('sort') as 'latest' | 'score') || 'latest';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    const articles = await getArticlesWithBookmarks(db, {
      feed_type,
      tag,
      search,
      status,
      sort,
      limit,
      offset,
    });

    return new Response(JSON.stringify(articles), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
