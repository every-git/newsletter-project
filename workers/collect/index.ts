import { runCollect, SOURCES } from '../../src/lib/collect';

interface Env {
  DB: D1Database;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = env.DB;
    const now = new Date();
    const hour = now.getUTCHours();

    const shouldCollect = (interval: string): boolean => {
      switch (interval) {
        case 'hourly':
          return true;
        case 'twice_daily':
          return hour === 19 || hour === 7;
        case 'daily':
          return hour === 19;
        default:
          return false;
      }
    };

    const sourceIds = SOURCES.filter((s) => s.type !== 'scrape' && shouldCollect(s.interval)).map(
      (s) => s.id
    );

    const results = await runCollect(db, sourceIds.length ? sourceIds : undefined);
    for (const [id, r] of Object.entries(results)) {
      if ('inserted' in r) {
        console.log(`[${id}] Collected: ${r.inserted}, Duplicates: ${r.duplicates}`);
      } else {
        console.error(`[${id}] Error:`, r.error);
      }
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/trigger') {
      const results = await runCollect(env.DB);
      return new Response(JSON.stringify(results, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Collect Worker', { status: 200 });
  },
};
