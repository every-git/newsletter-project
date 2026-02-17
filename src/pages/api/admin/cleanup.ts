import type { APIRoute } from 'astro';
import {
  deleteOldArticlesExceptBookmarked,
  countOldArticlesExceptBookmarked,
} from '../../../lib/db';

/**
 * GET: 삭제 대상 기사 수만 조회 (실제 삭제 없음). 로직 확인·미리보기용.
 * 쿼리: ?older_than_days=7
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.DB) {
    return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });
  }
  const db = runtime.env.DB;
  const url = new URL(request.url);
  const olderThanDays = Math.max(1, parseInt(url.searchParams.get('older_than_days') || '7', 10) || 7);
  try {
    const count = await countOldArticlesExceptBookmarked(db, olderThanDays);
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    return new Response(
      JSON.stringify({
        ok: true,
        would_delete: count,
        older_than_days: olderThanDays,
        cutoff_iso: cutoff,
        description: `${olderThanDays}일 이전(published_at < cutoff)이면서 북마크되지 않은 기사 수`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

/**
 * POST: 7일 이전 기사 중 북마크되지 않은 기사를 DB에서 삭제합니다.
 * body: { older_than_days?: number } (기본 7)
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
