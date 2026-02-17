/// <reference path="../.astro/types.d.ts" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type KVNamespace = import('@cloudflare/workers-types').KVNamespace;

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
  KV: KVNamespace;
  OPENROUTER_API_KEY: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
