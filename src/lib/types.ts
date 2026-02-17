export type FeedType = 'tech' | 'world';
export type ArticleStatus = 'active' | 'archived' | 'deleted';
export type DigestEdition = 'am' | 'pm';

export type Tag = 'ai' | 'frontend' | 'backend' | 'infra' | 'startup' | 'security' | 'mobile' | 'general';

export interface Article {
  id: string;
  url: string;
  url_hash: string;
  title: string;
  source: string;
  feed_type: FeedType;
  status: ArticleStatus;
  tags: string; // JSON array string
  summary_ko: string | null;
  insight_ko: string | null;
  score_community: number;
  score_llm: number;
  score_final: number;
  published_at: string;
  collected_at: string;
  archived_at: string | null;
  thumbnail_url: string | null;
}

export interface Digest {
  id: string;
  date: string;
  edition: DigestEdition;
  tech_top_ids: string; // JSON array string
  world_summary_ko: string;
  world_top_ids: string; // JSON array string
  categories: string; // JSON object string
  created_at: string;
}

export interface Bookmark {
  article_id: string;
  created_at: string;
}

export interface CollectLog {
  id: number;
  source: string;
  collected_count: number;
  duplicate_count: number;
  error_message: string | null;
  created_at: string;
}

export interface DigestView {
  digest: Digest;
  techArticles: Article[];
  worldArticles: Article[];
  categories: Record<string, Article[]>;
}

export interface ArticleWithBookmark extends Article {
  is_bookmarked: boolean;
}

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api' | 'scrape';
  feed_type: FeedType;
  interval: 'hourly' | 'twice_daily' | 'daily';
}
