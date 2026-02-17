import type { APIRoute } from 'astro';
import { getDigestById, getDigestsByDate, getLatestDigest, getArticlesByIds } from '../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const { env } = (locals as any).runtime;
  const db = env.DB;
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const edition = url.searchParams.get('edition');
  const id = url.searchParams.get('id');

  try {
    let digest;
    if (id) {
      digest = await getDigestById(db, id);
    } else if (date && edition) {
      digest = await getDigestById(db, `${date}-${edition}`);
    } else if (date) {
      const digests = await getDigestsByDate(db, date);
      return new Response(JSON.stringify(digests), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      digest = await getLatestDigest(db);
    }

    if (!digest) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    const techIds: string[] = JSON.parse(digest.tech_top_ids || '[]');
    const worldIds: string[] = JSON.parse(digest.world_top_ids || '[]');
    const techArticles = await getArticlesByIds(db, techIds);
    const worldArticles = await getArticlesByIds(db, worldIds);

    return new Response(
      JSON.stringify({ digest, techArticles, worldArticles }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
