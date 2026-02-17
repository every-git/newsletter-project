-- Tech Digest Newsletter - D1 Schema

-- 수집된 기사 원본
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  url_hash TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  tags TEXT DEFAULT '[]',
  summary_ko TEXT,
  insight_ko TEXT,
  score_community INTEGER DEFAULT 0,
  score_llm INTEGER DEFAULT 0,
  score_final REAL DEFAULT 0,
  published_at TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  archived_at TEXT,
  thumbnail_url TEXT
);

-- 하루 2회 다이제스트 (오전/오후)
CREATE TABLE IF NOT EXISTS digests (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  edition TEXT NOT NULL,
  tech_top_ids TEXT NOT NULL,
  world_summary_ko TEXT NOT NULL,
  world_top_ids TEXT NOT NULL,
  categories TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 북마크
CREATE TABLE IF NOT EXISTS bookmarks (
  article_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 수집 로그
CREATE TABLE IF NOT EXISTS collect_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  collected_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feed_type, score_final DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_url_hash ON articles(url_hash);
CREATE INDEX IF NOT EXISTS idx_digests_date ON digests(date DESC);
