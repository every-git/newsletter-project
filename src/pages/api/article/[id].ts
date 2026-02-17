import type { APIRoute } from 'astro';
import { updateArticleStatus, getArticleById } from '../../../lib/db';
import type { ArticleStatus } from '../../../lib/types';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { env } = (locals as any).runtime;
  const db = env.DB;
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  try {
    const body = await request.json();
    const status = body.status as ArticleStatus;

    if (!['active', 'archived', 'deleted'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    const updated = await updateArticleStatus(db, id, status);
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, status }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ params, locals }) => {
  const { env } = (locals as any).runtime;
  const db = env.DB;
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  try {
    const article = await getArticleById(db, id);
    if (!article) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    return new Response(JSON.stringify(article), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
