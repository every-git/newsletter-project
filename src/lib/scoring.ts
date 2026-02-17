const COMMUNITY_NORMS: Record<string, number> = {
  hackernews: 100,
  github: 500,
  techcrunch: 50,
  theverge: 50,
  geeknews: 30,
  yozm: 20,
  discoveryet: 20,
  cloudflare: 30,
  reuters: 40,
  apnews: 40,
  bbc: 40,
  yonhap: 30,
};

const FEED_WEIGHTS: Record<string, number> = {
  tech: 1.0,
  world: 0.5,
};

export function normalizeCommScore(source: string, rawScore: number): number {
  const norm = COMMUNITY_NORMS[source] || 50;
  return Math.min(rawScore / norm, 3.0);
}

export function calculateFinalScore(
  source: string,
  feedType: string,
  scoreCommunity: number,
  scoreLlm: number,
  publishedAt: string
): number {
  const commNorm = normalizeCommScore(source, scoreCommunity);
  const feedWeight = FEED_WEIGHTS[feedType] || 0.5;
  const base = (commNorm * 0.3 + scoreLlm / 100 * 0.7) * feedWeight;

  const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  let timeFactor = 1.0;
  if (hoursAgo <= 24) timeFactor = 1.2;
  else if (hoursAgo > 48) timeFactor = 0.5;

  return Math.round(base * timeFactor * 100) / 100;
}
