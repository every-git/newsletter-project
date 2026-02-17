import type { SourceConfig } from '../../../src/lib/types';

export interface CollectedArticle {
  url: string;
  title: string;
  source: string;
  feed_type: string;
  score_community: number;
  published_at: string;
  thumbnail_url: string | null;
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(match[0]);
  }
  return items;
}

function extractLink(itemXml: string): string {
  // Atom: <link href="..."/>
  const atomLink = itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLink) return atomLink[1];
  // RSS: <link>...</link>
  return extractText(itemXml, 'link');
}

function extractDate(itemXml: string): string {
  const pubDate = extractText(itemXml, 'pubDate');
  if (pubDate) return new Date(pubDate).toISOString();
  const updated = extractText(itemXml, 'updated');
  if (updated) return new Date(updated).toISOString();
  const published = extractText(itemXml, 'published');
  if (published) return new Date(published).toISOString();
  const dcDate = extractText(itemXml, 'dc:date');
  if (dcDate) return new Date(dcDate).toISOString();
  return new Date().toISOString();
}

function extractThumbnail(itemXml: string): string | null {
  const media = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (media) return media[1];
  const enclosure = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enclosure) return enclosure[1];
  const img = itemXml.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (img) return img[1];
  return null;
}

export async function fetchRSS(source: SourceConfig, limit = 20): Promise<CollectedArticle[]> {
  const res = await fetch(source.url, {
    headers: { 'User-Agent': 'TechDigest/1.0' },
  });
  if (!res.ok) throw new Error(`RSS fetch error for ${source.id}: ${res.status}`);

  const xml = await res.text();
  const items = extractItems(xml).slice(0, limit);

  return items
    .map((itemXml) => {
      const title = extractText(itemXml, 'title');
      const url = extractLink(itemXml);
      if (!title || !url) return null;

      return {
        url,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        source: source.id,
        feed_type: source.feed_type,
        score_community: 0,
        published_at: extractDate(itemXml),
        thumbnail_url: extractThumbnail(itemXml),
      };
    })
    .filter((a): a is CollectedArticle => !!a);
}
