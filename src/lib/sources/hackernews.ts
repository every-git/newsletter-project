interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number;
  type: string;
}

export interface CollectedArticle {
  url: string;
  title: string;
  source: string;
  feed_type: string;
  score_community: number;
  published_at: string;
  thumbnail_url: string | null;
}

export async function fetchHackerNews(limit = 30): Promise<CollectedArticle[]> {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);

  const ids: number[] = await res.json();
  const topIds = ids.slice(0, limit);

  const items = await Promise.all(
    topIds.map(async (id) => {
      const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (!itemRes.ok) return null;
      return itemRes.json() as Promise<HNItem>;
    })
  );

  return items
    .filter((item): item is HNItem => !!item && !!item.url && item.type === 'story' && item.score >= 10)
    .map((item) => ({
      url: item.url!,
      title: item.title,
      source: 'hackernews',
      feed_type: 'tech',
      score_community: item.score,
      published_at: new Date(item.time * 1000).toISOString(),
      thumbnail_url: null,
    }));
}
