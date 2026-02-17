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
  'deepseek/deepseek-chat-v3-0324:free',
  'google/gemini-2.5-flash-preview:free',
  'meta-llama/llama-4-maverick:free',
];

export async function callOpenRouter(
  apiKey: string,
  messages: OpenRouterMessage[],
  modelIndex = 0
): Promise<string> {
  const model = MODELS[modelIndex];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    // Fallback to next model
    if (modelIndex < MODELS.length - 1) {
      console.warn(`Model ${model} failed (${res.status}), trying fallback...`);
      return callOpenRouter(apiKey, messages, modelIndex + 1);
    }
    throw new Error(`OpenRouter API error: ${res.status} - ${errorText}`);
  }

  const data: OpenRouterResponse = await res.json();
  return data.choices[0]?.message?.content || '';
}
