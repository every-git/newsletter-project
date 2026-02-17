import type { SourceConfig } from '../../../src/lib/types';

export const SOURCES: SourceConfig[] = [
  // Tech Core
  {
    id: 'hackernews',
    name: 'Hacker News',
    url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    type: 'api',
    feed_type: 'tech',
    interval: 'hourly',
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    type: 'rss',
    feed_type: 'tech',
    interval: 'hourly',
  },
  {
    id: 'theverge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    type: 'rss',
    feed_type: 'tech',
    interval: 'hourly',
  },
  {
    id: 'geeknews',
    name: '긱뉴스',
    url: 'https://news.hada.io/rss/news',
    type: 'rss',
    feed_type: 'tech',
    interval: 'hourly',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Blog',
    url: 'https://blog.cloudflare.com/rss/',
    type: 'rss',
    feed_type: 'tech',
    interval: 'daily',
  },
  {
    id: 'yozm',
    name: '요즘IT',
    url: 'https://yozm.wishket.com/magazine/list-rss/',
    type: 'rss',
    feed_type: 'tech',
    interval: 'daily',
  },
  {
    id: 'github',
    name: 'GitHub Trending',
    url: 'https://github.com/trending',
    type: 'scrape',
    feed_type: 'tech',
    interval: 'daily',
  },

  // World Macro
  {
    id: 'reuters',
    name: 'Reuters',
    url: 'https://feeds.reuters.com/reuters/topNews',
    type: 'rss',
    feed_type: 'world',
    interval: 'twice_daily',
  },
  {
    id: 'bbc',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    type: 'rss',
    feed_type: 'world',
    interval: 'twice_daily',
  },
  {
    id: 'yonhap',
    name: '연합뉴스',
    url: 'https://www.yonhapnewstv.co.kr/browse/feed/',
    type: 'rss',
    feed_type: 'world',
    interval: 'twice_daily',
  },
];
