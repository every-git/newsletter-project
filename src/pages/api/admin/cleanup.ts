import type { APIRoute } from 'astro';
import { deleteOldArticlesExceptBookmarked } from '../../../lib/db';

/**
 * POST: 7일 이전 기사 중 북마크되지 않은 기사를 DB에서 삭제합니다.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.DB) {
    return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });
  }

  const db = runtime.env.DB;
  const body = await request.json().catch(() => ({}));
  const olderThanDays = typeof body.older_than_days === 'number' ? body.older_than_days : 7;

  try {
    const deleted = await deleteOldArticlesExceptBookmarked(db, olderThanDays);
    return new Response(
      JSON.stringify({ ok: true, deleted, older_than_days: olderThanDays }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
