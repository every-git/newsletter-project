import type { APIRoute } from 'astro';
import { toggleBookmark, getBookmarkedArticles } from '../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = (locals as any).runtime;
  const db = env.DB;

  try {
    const body = await request.json();
    const articleId = body.article_id;

    if (!articleId) {
      return new Response(JSON.stringify({ error: 'Missing article_id' }), { status: 400 });
    }

    const isBookmarked = await toggleBookmark(db, articleId);
    return new Response(JSON.stringify({ ok: true, is_bookmarked: isBookmarked }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ locals }) => {
  const { env } = (locals as any).runtime;
  const db = env.DB;

  try {
    const articles = await getBookmarkedArticles(db);
    return new Response(JSON.stringify(articles), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
