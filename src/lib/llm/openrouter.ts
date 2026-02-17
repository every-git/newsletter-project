interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const MODELS = [
  'qwen/qwen3-next-80b-a3b-instruct:free', // 80B MoE, 262K ctx, JSON 지원, 무료
  'google/gemma-3-27b-it:free',             // 27B, 131K ctx, JSON 지원, 무료
  'upstage/solar-pro-3:free',               // 128K ctx, JSON 지원, 무료
  'meta-llama/llama-3.3-70b-instruct:free', // 70B, 128K ctx, 무료 최종 폴백
  'google/gemini-2.0-flash-001',            // $0.10/M, 1M ctx, JSON 지원, 한국어 우수, 유료 폴백
];

const DEFAULT_DAILY_LIMIT = 50;
const CHUNK_SIZE = 25;
const KV_DAILY_LIMIT_KEY = 'openrouter-daily-limit';

function getDailyKey(): string {
  return `openrouter-daily-${new Date().toISOString().slice(0, 10)}`;
}

export async function getOpenRouterDailyLimit(kv: KVNamespace | null): Promise<number> {
  if (!kv) return DEFAULT_DAILY_LIMIT;
  const val = await kv.get(KV_DAILY_LIMIT_KEY);
  return val ? parseInt(val, 10) : DEFAULT_DAILY_LIMIT;
}

export async function setOpenRouterDailyLimit(kv: KVNamespace, limit: number): Promise<void> {
  await kv.put(KV_DAILY_LIMIT_KEY, String(limit));
}

export async function getOpenRouterDailyCount(kv: KVNamespace | null): Promise<number> {
  if (!kv) return 0;
  const key = getDailyKey();
  const val = await kv.get(key);
  return val ? parseInt(val, 10) : 0;
}

export async function incrementOpenRouterDailyCount(kv: KVNamespace | null): Promise<number> {
  if (!kv) return 0;
  const key = getDailyKey();
  const current = await getOpenRouterDailyCount(kv);
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: 86400 * 2 });
  return next;
}

export async function checkOpenRouterUsage(apiKey: string): Promise<{
  limit: number | null;
  usage: number | null;
  remaining: number | null;
}> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { limit: null, usage: null, remaining: null };
    const data = await res.json() as any;
    const limit = data.data?.limit ?? null;
    const usage = data.data?.usage ?? null;
    return {
      limit,
      usage,
      remaining: limit != null && usage != null ? limit - usage : null,
    };
  } catch {
    return { limit: null, usage: null, remaining: null };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callOpenRouter(
  apiKey: string,
  messages: OpenRouterMessage[],
  modelIndex = 0,
  kv: KVNamespace | null = null
): Promise<string> {
  if (kv) {
    const [count, limit] = await Promise.all([
      getOpenRouterDailyCount(kv),
      getOpenRouterDailyLimit(kv),
    ]);
    if (count >= limit) {
      throw new Error(`OpenRouter daily limit reached (${count}/${limit}). Try again tomorrow.`);
    }
  }

  const model = MODELS[modelIndex];

  const doFetch = async (): Promise<Response> => {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tech-digest.pages.dev',
        'X-Title': 'Tech Digest',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });
  };

  let res = await doFetch();

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 60000) : 5000;
    await sleep(waitMs);
    res = await doFetch();
    if (res.status === 429) {
      await sleep(5000);
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    if (modelIndex < MODELS.length - 1) {
      console.warn(`Model ${model} failed (${res.status}), trying fallback...`);
      return callOpenRouter(apiKey, messages, modelIndex + 1, kv);
    }
    throw new Error(`OpenRouter API error: ${res.status} - ${errorText}`);
  }

  if (kv) {
    await incrementOpenRouterDailyCount(kv);
  }

  const data: OpenRouterResponse = await res.json();
  const content = data.choices[0]?.message?.content || '';
  if (!content.trim()) {
    if (modelIndex < MODELS.length - 1) {
      console.warn(`Model ${model} returned empty response, trying fallback...`);
      return callOpenRouter(apiKey, messages, modelIndex + 1, kv);
    }
    throw new Error(`All models returned empty responses`);
  }
  return content;
}

export async function callOpenRouterWithChunking(
  apiKey: string,
  messagesByChunk: OpenRouterMessage[][],
  kv: KVNamespace | null = null
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < messagesByChunk.length; i++) {
    if (i > 0) await sleep(3000); // rpm 제한 대응
    const content = await callOpenRouter(apiKey, messagesByChunk[i], 0, kv);
    results.push(content);
  }
  return results;
}

export const OPENROUTER_CHUNK_SIZE = CHUNK_SIZE;
